import { Injectable, Logger } from '@nestjs/common';
import * as vm from 'vm';

export interface ScriptResult {
  success: boolean;
  value?: unknown;
  variables?: Record<string, unknown>;
  error?: string;
}

@Injectable()
export class ScriptExecutorService {
  private readonly logger = new Logger(ScriptExecutorService.name);
  private readonly TIMEOUT_MS = 1000;

  /**
   * Execute user script with $ proxy for data access
   * @param code - User JavaScript code
   * @param data - API data accessible via $.fieldName
   * @param mode - 'value' returns script result, 'template' extracts declared variables
   */
  execute(
    code: string,
    data: unknown,
    mode: 'value' | 'template',
  ): ScriptResult {
    try {
      // Create $ proxy that allows accessing nested fields
      const $ = this.createDataProxy(data);

      // Safe globals only
      const context: vm.Context = {
        $,
        Math,
        String,
        Number,
        Boolean,
        JSON: {
          parse: JSON.parse,
          stringify: JSON.stringify,
        },
        Array: {
          isArray: Array.isArray,
          from: Array.from,
        },
        Object: {
          keys: Object.keys,
          values: Object.values,
          entries: Object.entries,
        },
        Date,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
        encodeURIComponent,
        decodeURIComponent,
      };

      vm.createContext(context);

      if (mode === 'value') {
        return this.executeValueMode(context, code);
      } else {
        return this.executeTemplateMode(context, code);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Script execution failed: ${message}`);
      return { success: false, error: message };
    }
  }

  /**
   * Execute script in value mode - returns the result of the script
   */
  private executeValueMode(context: vm.Context, code: string): ScriptResult {
    // Wrap code in IIFE to capture return value
    const wrappedCode = `(function() { ${code} })()`;

    try {
      const script = new vm.Script(wrappedCode);
      const result = script.runInContext(context, { timeout: this.TIMEOUT_MS });
      return { success: true, value: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Execute script in template mode - extracts all declared variables
   */
  private executeTemplateMode(context: vm.Context, code: string): ScriptResult {
    // Extract variable names declared with var, let, or const
    const variableNames = this.extractVariableNames(code);

    // Build code that executes user script and collects variables
    const collectVarsCode = variableNames
      .map((v) => `if (typeof ${v} !== 'undefined') __vars['${v}'] = ${v};`)
      .join('\n');

    const wrappedCode = `
      (function() {
        var __vars = {};
        ${code}
        ${collectVarsCode}
        return __vars;
      })()
    `;

    try {
      const script = new vm.Script(wrappedCode);
      const variables = script.runInContext(context, {
        timeout: this.TIMEOUT_MS,
      }) as Record<string, unknown>;
      return { success: true, variables };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Extract variable names from code (var, let, const declarations)
   */
  private extractVariableNames(code: string): string[] {
    const varRegex = /(?:var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    const names: string[] = [];
    let match;
    while ((match = varRegex.exec(code)) !== null) {
      // Skip internal variables
      if (!match[1].startsWith('__')) {
        names.push(match[1]);
      }
    }
    return [...new Set(names)]; // Remove duplicates
  }

  /**
   * Create a proxy object that allows accessing nested data via $ syntax
   * Supports: $.field, $.nested.field, $.array[0].field
   */
  private createDataProxy(data: unknown): unknown {
    // If data is not an object, return as-is
    if (data === null || typeof data !== 'object') {
      return data;
    }

    // Return the data directly - user will access fields via $.fieldName
    return data;
  }
}
