export type ContactRole = "Eventleder" | "Gæst";

export type ContactSource = {
  id: string;
  name: string;
  role: ContactRole;
  email: string | null;
  phone: string | null;
  shareEmail: boolean;
  sharePhone: boolean;
};

export type ContactBookEntry = {
  id: string;
  name: string;
  role: ContactRole;
  email: string | null;
  phone: string | null;
};

export function buildContactBook(contacts: ContactSource[]): ContactBookEntry[] {
  return contacts
    .map((contact) => ({
      id: contact.id,
      name: contact.name,
      role: contact.role,
      email: contact.shareEmail ? contact.email : null,
      phone: contact.sharePhone ? contact.phone : null
    }))
    .filter((contact) => Boolean(contact.email || contact.phone));
}
