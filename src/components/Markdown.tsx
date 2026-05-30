import React from "react";

interface MarkdownProps {
  content: string;
}

export default function Markdown({ content }: MarkdownProps) {
  if (!content) return null;

  const lines = content.split("\n");
  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  const renderedElements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Table parsing
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const cells = line
        .split("|")
        .map(c => c.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

      if (!inTable) {
        // This is a header or alignment row
        if (line.includes("---")) {
          // Alignment separator, skip
          continue;
        } else {
          inTable = true;
          tableHeaders = cells;
          tableRows = [];
        }
      } else {
        if (line.includes("---")) {
          continue;
        }
        tableRows.push(cells);
      }
      continue;
    } else {
      if (inTable) {
        // Flush the parsed table
        const currentHeaders = [...tableHeaders];
        const currentRows = [...tableRows];
        renderedElements.push(
          <div key={`table-${i}`} className="my-5 overflow-x-auto border border-gray-100 rounded-lg shadow-xxs">
            <table className="w-full text-xs text-left text-gray-600 border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {currentHeaders.map((h, hIdx) => (
                    <th key={hIdx} className="p-3 font-semibold text-gray-700">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentRows.map((r, rIdx) => (
                  <tr key={rIdx} className="border-b border-gray-50 hover:bg-gray-50/40">
                    {r.map((cell, cIdx) => (
                      <td key={cIdx} className="p-3 font-medium">
                        {parseLineFormatting(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        inTable = false;
        tableHeaders = [];
        tableRows = [];
      }
    }

    const trimmed = line.trim();

    // Headers
    if (trimmed.startsWith("###")) {
      renderedElements.push(
        <h4 key={i} className="text-sm font-bold text-gray-800 mt-5 mb-2.5 uppercase tracking-wider flex items-center gap-1.5">
          {parseLineFormatting(trimmed.substring(3))}
        </h4>
      );
    } else if (trimmed.startsWith("##")) {
      renderedElements.push(
        <h3 key={i} className="text-base font-bold text-gray-900 mt-6 mb-3.5 border-b border-gray-50 pb-1 flex items-center gap-2">
          {parseLineFormatting(trimmed.substring(2))}
        </h3>
      );
    } else if (trimmed.startsWith("#")) {
      renderedElements.push(
        <h2 key={i} className="text-lg font-black text-gray-900 mt-7 mb-4 tracking-tight">
          {parseLineFormatting(trimmed.substring(1))}
        </h2>
      );
    }
    // Bullet lists
    else if (trimmed.startsWith("*") || trimmed.startsWith("-")) {
      renderedElements.push(
        <div key={i} className="flex gap-2 text-xs text-gray-600 ml-4 py-0.5 items-start">
          <span className="text-emerald-500 font-bold shrink-0 mt-0.5">•</span>
          <span className="leading-relaxed leading-5">{parseLineFormatting(trimmed.substring(1))}</span>
        </div>
      );
    }
    // Empty lines
    else if (trimmed === "") {
      renderedElements.push(<div key={i} className="h-2" />);
    }
    // Normal paragraph
    else {
      renderedElements.push(
        <p key={i} className="text-xs text-gray-600/90 leading-relaxed font-normal leading-6 my-2">
          {parseLineFormatting(line)}
        </p>
      );
    }
  }

  // Double check if table needs flushing
  if (inTable) {
    const currentHeaders = [...tableHeaders];
    const currentRows = [...tableRows];
    renderedElements.push(
      <div key="table-flush" className="my-5 overflow-x-auto border border-gray-100 rounded-lg shadow-xxs">
        <table className="w-full text-xs text-left text-gray-600 border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {currentHeaders.map((h, hIdx) => (
                <th key={hIdx} className="p-3 font-semibold text-gray-700">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentRows.map((r, rIdx) => (
              <tr key={rIdx} className="border-b border-gray-50 hover:bg-gray-50/40">
                {r.map((cell, cIdx) => (
                  <td key={cIdx} className="p-3 font-medium">
                    {parseLineFormatting(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <div className="space-y-1 my-1 pr-1">{renderedElements}</div>;
}

// Inline formatting (bold, italic, code tags)
function parseLineFormatting(text: string): React.ReactNode {
  // simple matching for **bold**
  if (!text.includes("**") && !text.includes("`")) {
    return text;
  }

  const parts: React.ReactNode[] = [];
  let index = 0;

  // Let's tokenise the string
  // Regex to match **text** or `code`
  const regex = /(\*\*|`)(.*?)\1/g;
  let match;
  let lastPos = 0;

  while ((match = regex.exec(text)) !== null) {
    const [full, tag, inner] = match;
    const matchPos = match.index;

    // Flush text before matches
    if (matchPos > lastPos) {
      parts.push(text.substring(lastPos, matchPos));
    }

    if (tag === "**") {
      parts.push(
        <strong key={matchPos} className="font-extrabold text-gray-800">
          {inner}
        </strong>
      );
    } else {
      parts.push(
        <code key={matchPos} className="bg-slate-100 text-rose-600 font-mono px-1.5 py-0.5 rounded-md text-xxs font-semibold">
          {inner}
        </code>
      );
    }

    lastPos = regex.lastIndex;
    index++;
  }

  if (lastPos < text.length) {
    parts.push(text.substring(lastPos));
  }

  return <>{parts}</>;
}
