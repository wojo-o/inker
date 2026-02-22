#!/usr/bin/env node

/**
 * API Variable Explorer
 *
 * This script fetches JSON from an API endpoint and lists all available
 * variables (keys) in dot notation, making it easy to see what data
 * is available for use in templates or widgets.
 *
 * Usage: node list-api-variables.js <api-url>
 * Example: node list-api-variables.js https://api.example.com/data
 */

/**
 * Recursively extracts all keys from an object in dot notation.
 *
 * This uses a technique called "recursion" - a function that calls itself
 * to handle nested structures. Each level of nesting adds to the "prefix"
 * which builds up the dot notation path.
 *
 * @param {any} obj - The object to extract keys from
 * @param {string} prefix - Current path prefix (builds up as we go deeper)
 * @param {Set<string>} keys - Set to collect unique keys
 * @returns {Set<string>} - Set of all keys in dot notation
 */
function extractKeys(obj, prefix = '', keys = new Set()) {
  // Base case: if obj is null or not an object, we've reached a leaf value
  if (obj === null || typeof obj !== 'object') {
    // Only add if we have a prefix (meaning this is a valid path)
    if (prefix) {
      keys.add(prefix);
    }
    return keys;
  }

  // Handle arrays - we show the structure of the first element
  // Using [] notation to indicate "any array index"
  if (Array.isArray(obj)) {
    if (obj.length > 0) {
      // Explore the first element to show the array item structure
      // We use [] to indicate this is an array element
      extractKeys(obj[0], prefix ? `${prefix}[]` : '[]', keys);
    } else {
      // Empty array - just note it exists
      if (prefix) {
        keys.add(`${prefix}[]`);
      }
    }
    return keys;
  }

  // Handle objects - iterate through each property
  for (const [key, value] of Object.entries(obj)) {
    // Build the new path: either "key" or "parent.key"
    const newPrefix = prefix ? `${prefix}.${key}` : key;

    // Recurse into the value
    extractKeys(value, newPrefix, keys);
  }

  return keys;
}

/**
 * Organizes keys into a tree structure for prettier display.
 * Groups keys by their top-level parent.
 */
function organizeKeys(keys) {
  const organized = {};

  for (const key of keys) {
    const topLevel = key.split('.')[0].replace('[]', '');
    if (!organized[topLevel]) {
      organized[topLevel] = [];
    }
    organized[topLevel].push(key);
  }

  return organized;
}

/**
 * Formats and prints the discovered variables in a readable way.
 */
function printVariables(keys, jsonData) {
  const sortedKeys = Array.from(keys).sort();
  const organized = organizeKeys(sortedKeys);

  console.log('\n' + '='.repeat(60));
  console.log('📋 DISCOVERED VARIABLES');
  console.log('='.repeat(60));

  // Print organized by top-level key
  for (const [section, sectionKeys] of Object.entries(organized).sort()) {
    console.log(`\n▸ ${section}`);
    for (const key of sectionKeys.sort()) {
      // Get sample value for context
      const sampleValue = getSampleValue(jsonData, key);
      const typeInfo = getTypeInfo(sampleValue);
      console.log(`    ${key} ${typeInfo}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${sortedKeys.length} variables found`);
  console.log('='.repeat(60) + '\n');
}

/**
 * Gets a sample value from the JSON using a dot notation path.
 * Handles array notation [] by accessing index 0.
 */
function getSampleValue(obj, path) {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    // Handle array notation
    if (part.endsWith('[]')) {
      const key = part.slice(0, -2);
      current = key ? current[key] : current;
      if (Array.isArray(current) && current.length > 0) {
        current = current[0];
      } else {
        return undefined;
      }
    } else {
      current = current[part];
    }
  }

  return current;
}

/**
 * Returns a formatted type indicator for a value.
 */
function getTypeInfo(value) {
  if (value === null) return '(null)';
  if (value === undefined) return '(undefined)';
  if (Array.isArray(value)) return '(array)';

  const type = typeof value;

  if (type === 'string') {
    // Show truncated sample for strings
    const sample = value.length > 30 ? value.slice(0, 30) + '...' : value;
    return `(string) → "${sample}"`;
  }
  if (type === 'number') return `(number) → ${value}`;
  if (type === 'boolean') return `(boolean) → ${value}`;
  if (type === 'object') return '(object)';

  return `(${type})`;
}

/**
 * Main function - orchestrates the fetching and processing.
 *
 * Uses async/await for cleaner asynchronous code. The 'async' keyword
 * allows us to use 'await' to pause execution until a Promise resolves,
 * making asynchronous code read more like synchronous code.
 */
async function main() {
  // Get URL from command line arguments
  // process.argv contains: [node, script.js, ...args]
  const url = process.argv[2];

  if (!url) {
    console.error('\n❌ Error: Please provide an API URL');
    console.error('\nUsage: node list-api-variables.js <api-url>');
    console.error('Example: node list-api-variables.js https://api.github.com/users/octocat');
    process.exit(1);
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    console.error('\n❌ Error: Invalid URL format');
    console.error(`Provided: ${url}`);
    process.exit(1);
  }

  console.log(`\n🔍 Fetching data from: ${url}`);

  try {
    // Fetch the API data
    // fetch() returns a Promise that resolves to a Response object
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Inker-Variable-Explorer/1.0'
      }
    });

    // Check if the request was successful
    // HTTP status codes 200-299 indicate success
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Parse the JSON response
    // .json() also returns a Promise, hence the await
    const data = await response.json();

    console.log('✅ Data fetched successfully!');

    // Extract all keys from the JSON structure
    const keys = extractKeys(data);

    if (keys.size === 0) {
      console.log('\n⚠️  No variables found. The response might be empty or a primitive value.');
      console.log('Raw response:', JSON.stringify(data, null, 2));
      return;
    }

    // Print the results
    printVariables(keys, data);

    // Also offer to show raw JSON
    console.log('💡 Tip: To see the raw JSON, run with DEBUG=1');
    if (process.env.DEBUG) {
      console.log('\n📄 Raw JSON Response:');
      console.log(JSON.stringify(data, null, 2));
    }

  } catch (error) {
    // Error handling - different error types need different messages
    if (error.cause?.code === 'ENOTFOUND') {
      console.error(`\n❌ Error: Could not resolve hostname`);
      console.error(`The URL "${url}" could not be reached. Check the address.`);
    } else if (error.cause?.code === 'ECONNREFUSED') {
      console.error(`\n❌ Error: Connection refused`);
      console.error(`The server at "${url}" refused the connection.`);
    } else if (error.message?.includes('JSON')) {
      console.error(`\n❌ Error: Invalid JSON response`);
      console.error(`The API did not return valid JSON data.`);
    } else {
      console.error(`\n❌ Error: ${error.message}`);
    }
    process.exit(1);
  }
}

// Run the main function
// .catch() handles any unhandled errors at the top level
main().catch(console.error);
