export type ImportedGuest = {
  displayName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  children: string[];
  line: number;
};

export type GuestImportResult = {
  guests: ImportedGuest[];
  errors: string[];
};

const PHONE_PATTERN = /^[0-9+() .-]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEADER_NAMES = new Set(["navn", "name", "gæst", "gæstenavn"]);
const HEADER_PHONES = new Set(["telefon", "phone", "telefonnummer", "mobil"]);
const HEADER_EMAILS = new Set(["mail", "email", "e-mail", "e-post"]);

function parseDelimitedLine(value: string): string[] {
  const delimiter = value.includes(";") && !value.includes(",") ? ";" : ",";
  if (!value.includes(delimiter)) return [value.trim()];

  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '"') {
      if (quoted && value[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  cells.push(current.trim());
  return cells;
}

function normalizedHeader(value: string) {
  return value.trim().toLocaleLowerCase("da-DK").replaceAll(" ", "");
}

function isHeader(cells: string[]) {
  return (
    HEADER_NAMES.has(normalizedHeader(cells[0] ?? "")) &&
    (cells.length === 1 || HEADER_PHONES.has(normalizedHeader(cells[1] ?? "")))
  );
}

function childName(value: string) {
  return value
    .trim()
    .replace(/^[-–—]\s*/, "")
    .replace(/^barn\s*:\s*/i, "")
    .trim();
}

function isChildLine(rawLine: string, cells: string[]) {
  const trimmed = rawLine.trimStart();
  return (
    rawLine.length !== trimmed.length ||
    /^[-–—]\s+/.test(trimmed) ||
    /^barn\s*:/i.test(trimmed) ||
    (!cells[0] && Boolean(cells[1]))
  );
}

function addChild(
  guests: ImportedGuest[],
  errors: string[],
  value: string,
  lineNumber: number
) {
  const name = childName(value);
  if (!name) {
    errors.push(`Linje ${lineNumber}: Barnets navn mangler.`);
    return;
  }
  if (name.length > 80) {
    errors.push(`Linje ${lineNumber}: Barnets navn må højst være 80 tegn.`);
    return;
  }
  const parent = guests.at(-1);
  if (!parent) {
    errors.push(`Linje ${lineNumber}: Et barn skal stå efter en hovedgæst.`);
    return;
  }
  parent.children.push(name);
}

export function parseGuestImport(input: string): GuestImportResult {
  const guests: ImportedGuest[] = [];
  const errors: string[] = [];
  const lines = input.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  let declaredEmailColumn = false;

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const lineNumber = index + 1;
    if (!rawLine.trim()) continue;

    const cells = parseDelimitedLine(rawLine.trim());
    if (isHeader(cells)) {
      declaredEmailColumn = HEADER_EMAILS.has(normalizedHeader(cells[2] ?? ""));
      continue;
    }

    if (isChildLine(rawLine, cells)) {
      addChild(guests, errors, cells[0] || cells[1] || "", lineNumber);
      continue;
    }

    const displayName = cells[0]?.trim() ?? "";
    if (!displayName) {
      errors.push(`Linje ${lineNumber}: Navnet mangler.`);
      continue;
    }
    if (displayName.length > 80) {
      errors.push(`Linje ${lineNumber}: Navnet må højst være 80 tegn.`);
      continue;
    }

    let contactPhone: string | null = null;
    let contactEmail: string | null = null;
    const children: string[] = [];
    const secondCell = cells[1]?.trim() ?? "";
    const secondCellIsChild = /^barn\b/i.test(secondCell);

    if (secondCell) {
      if (secondCellIsChild) {
        children.push(childName(secondCell));
      } else if (secondCell.length <= 30 && PHONE_PATTERN.test(secondCell)) {
        contactPhone = secondCell;
      } else {
        errors.push(
          `Linje ${lineNumber}: Telefonen er ugyldig. Brug kun tal, mellemrum, +, -, punktum og parenteser.`
        );
      }
    }

    const thirdCell = cells[2]?.trim() ?? "";
    if (thirdCell) {
      if (thirdCell.length <= 254 && EMAIL_PATTERN.test(thirdCell)) {
        contactEmail = thirdCell;
      } else if (declaredEmailColumn) {
        errors.push(`Linje ${lineNumber}: Mailadressen er ugyldig.`);
      } else {
        const name = childName(thirdCell);
        if (name.length > 80) {
          errors.push(`Linje ${lineNumber}: Barnets navn må højst være 80 tegn.`);
        } else if (name) {
          children.push(name);
        }
      }
    }

    for (const extraCell of cells.slice(3)) {
      if (!extraCell.trim()) continue;
      const name = childName(extraCell);
      if (!name) continue;
      if (name.length > 80) {
        errors.push(`Linje ${lineNumber}: Barnets navn må højst være 80 tegn.`);
      } else {
        children.push(name);
      }
    }

    guests.push({
      displayName,
      contactEmail,
      contactPhone,
      children,
      line: lineNumber
    });
  }

  if (guests.length > 100) {
    errors.push("Der kan højst importeres 100 invitationer ad gangen.");
  }
  const peopleCount = guests.reduce(
    (total, guest) => total + 1 + guest.children.length,
    0
  );
  if (peopleCount > 500) {
    errors.push("Der kan højst importeres 500 personer ad gangen.");
  }

  return { guests, errors };
}
