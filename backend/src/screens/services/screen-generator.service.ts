import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Screen Generator Service
 * Uses Puppeteer (headless Chrome) to generate screenshots from HTML content
 * Similar to Ruby's Ferrum gem functionality
 */
@Injectable()
export class ScreenGeneratorService implements OnModuleDestroy {
  private readonly logger = new Logger(ScreenGeneratorService.name);
  private browser: Browser | null = null;

  /**
   * Initialize the headless browser (lazy initialization)
   * Browser is initialized on first use, not on module startup
   * This avoids blocking app startup if Puppeteer dependencies are missing
   * Handles browser reconnection if the browser crashes or disconnects
   */
  private async ensureBrowserInitialized() {
    // Check if browser exists and is still connected
    if (this.browser) {
      try {
        // Test if browser is still responsive by checking if it's connected
        if (!this.browser.connected) {
          this.logger.warn('Puppeteer browser disconnected, reinitializing...');
          this.browser = null;
        }
      } catch {
        // Browser is in an invalid state, reset it
        this.logger.warn('Puppeteer browser in invalid state, reinitializing...');
        this.browser = null;
      }
    }

    if (this.browser) {
      return;
    }

    this.logger.log('Initializing Puppeteer browser...');
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-dev-tools',
          '--font-render-hinting=none',
          '--disable-font-subpixel-positioning',
          '--force-color-profile=srgb',
        ],
      });

      // Set up disconnect handler to reset browser reference
      this.browser.on('disconnected', () => {
        this.logger.warn('Puppeteer browser disconnected unexpectedly');
        this.browser = null;
      });

      this.logger.log('Puppeteer browser initialized successfully');
    } catch (error) {
      this.logger.warn(
        'Failed to initialize Puppeteer browser (screen generation from HTML will not be available):',
        error.message,
      );
      // Don't throw - allow app to start even if Puppeteer fails
      // Screen generation from images will still work
    }
  }

  /**
   * Cleanup browser on module destroy
   */
  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.logger.log('Puppeteer browser closed');
    }
  }

  /**
   * Generate screenshot from HTML content
   * @param html HTML content to render
   * @param width Screen width in pixels
   * @param height Screen height in pixels
   * @param outputPath Path to save the screenshot
   * @returns Path to generated screenshot
   */
  async generateFromHtml(
    html: string,
    width: number,
    height: number,
    outputPath: string,
  ): Promise<string> {
    await this.ensureBrowserInitialized();

    if (!this.browser) {
      throw new Error(
        'Browser not available - Puppeteer failed to initialize. Check system dependencies.',
      );
    }

    let page: Page | null = null;

    try {
      this.logger.debug(`Generating screenshot: ${width}x${height}`);

      page = await this.browser.newPage();

      // Set viewport size
      await page.setViewport({
        width,
        height,
        deviceScaleFactor: 1,
      });

      // Set HTML content
      await page.setContent(html, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Wait for fonts to load (with timeout fallback)
      await Promise.race([
        page.evaluateHandle('document.fonts.ready'),
        new Promise(resolve => setTimeout(resolve, 2000)),
      ]);

      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      await fs.mkdir(outputDir, { recursive: true });

      // Take screenshot
      await page.screenshot({
        path: outputPath,
        type: 'png',
        fullPage: false,
      });

      this.logger.debug(`Screenshot saved to: ${outputPath}`);

      return outputPath;
    } catch (error) {
      this.logger.error('Failed to generate screenshot:', error);
      throw error;
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Generate screenshot from URL
   * @param url URL to render
   * @param width Screen width in pixels
   * @param height Screen height in pixels
   * @param outputPath Path to save the screenshot
   * @returns Path to generated screenshot
   */
  async generateFromUrl(
    url: string,
    width: number,
    height: number,
    outputPath: string,
  ): Promise<string> {
    await this.ensureBrowserInitialized();

    if (!this.browser) {
      throw new Error(
        'Browser not available - Puppeteer failed to initialize. Check system dependencies.',
      );
    }

    let page: Page | null = null;

    try {
      this.logger.debug(`Generating screenshot from URL: ${url}`);

      page = await this.browser.newPage();

      // Set viewport size
      await page.setViewport({
        width,
        height,
        deviceScaleFactor: 1,
      });

      // Navigate to URL
      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      await fs.mkdir(outputDir, { recursive: true });

      // Take screenshot
      await page.screenshot({
        path: outputPath,
        type: 'png',
        fullPage: false,
      });

      this.logger.debug(`Screenshot saved to: ${outputPath}`);

      return outputPath;
    } catch (error) {
      this.logger.error('Failed to generate screenshot from URL:', error);
      throw error;
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Generate screenshot from HTML template with data
   * Useful for generating dynamic screens from templates
   */
  async generateFromTemplate(
    templateHtml: string,
    data: Record<string, any>,
    width: number,
    height: number,
    outputPath: string,
  ): Promise<string> {
    // Simple template interpolation
    let processedHtml = templateHtml;

    // Replace {{variable}} with data values
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processedHtml = processedHtml.replace(regex, String(value));
    });

    return this.generateFromHtml(processedHtml, width, height, outputPath);
  }
}
