export interface PasteResult {
  text: string;
  wasTruncated: boolean;
  lineCount: number;
}

const MAX_PASTE_SIZE = 100_000;

export function processPaste(
  rawText: string,
  currentValue: string,
  cursorPosition: number,
): { newValue: string; newCursor: number; result: PasteResult } {
  let text = rawText;

  // Strip null bytes
  text = text.replace(/\0/g, '');

  // Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  let wasTruncated = false;
  if (text.length > MAX_PASTE_SIZE) {
    text = text.slice(0, MAX_PASTE_SIZE);
    wasTruncated = true;
  }

  const before = currentValue.slice(0, cursorPosition);
  const after = currentValue.slice(cursorPosition);
  const newValue = before + text + after;
  const newCursor = cursorPosition + text.length;
  const lineCount = text.split('\n').length;

  return {
    newValue,
    newCursor,
    result: {
      text: text.slice(0, 100),
      wasTruncated,
      lineCount,
    },
  };
}
