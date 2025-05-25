
// Assuming the existing validation.ts file has other functions
// We're only updating the functions we need to fix

/**
 * Check if an object is a string record (dictionary with string keys and string values)
 */
export function isStringRecord(obj: unknown): obj is Record<string, string> {
  if (obj === null || typeof obj !== 'object') {
    console.error('Expected object, got:', typeof obj);
    return false;
  }

  // Check each property to ensure it's a string
  for (const key in obj) {
    if (typeof (obj as Record<string, unknown>)[key] !== 'string') {
      console.error(`Property ${key} is not a string, it's:`, typeof (obj as Record<string, unknown>)[key]);
      return false;
    }
  }

  return true;
}

/**
 * Transform draft data from the database to ensure it meets the expected format
 */
export function transformDraftData(data: any) {
  console.log("Transforming draft data:", data);
  
  if (!data) {
    console.error("Draft data is null or undefined");
    return null;
  }

  // Validate required fields
  const requiredFields = ['id', 'biography_id', 'full_content'];
  for (const field of requiredFields) {
    if (!data[field]) {
      console.error(`Draft data missing required field: ${field}`);
      console.log("Draft data structure:", data);
      return null;
    }
  }

  // Ensure chapter_content exists and is a valid object
  if (!data.chapter_content) {
    console.error("Draft data missing chapter_content");
    data.chapter_content = {};
  }

  if (typeof data.chapter_content !== 'object') {
    console.error("chapter_content is not an object:", data.chapter_content);
    try {
      // Try to parse if it's a JSON string
      data.chapter_content = JSON.parse(data.chapter_content);
    } catch (e) {
      console.error("Failed to parse chapter_content as JSON:", e);
      data.chapter_content = {};
    }
  }

  // Ensure each chapter_content value is a string
  for (const key in data.chapter_content) {
    if (typeof data.chapter_content[key] !== 'string') {
      console.warn(`Chapter content for "${key}" is not a string, converting to string`);
      data.chapter_content[key] = String(data.chapter_content[key]);
    }
  }

  console.log("Transformed draft data:", data);
  return data;
}
