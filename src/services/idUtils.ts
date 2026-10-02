export const normId = (id: string | number | null | undefined): string => {
  if (id === null || id === undefined) return '';

  const str = String(id).trim().toLowerCase();

  const cleaned = str.replace(
    /^(ct|cat|city|category)[-_]?0*/i,
    ''
  );

  return cleaned || str;
};


export const getProfileInitial = (fullName: string | null | undefined): string => {
  const name = (fullName ?? "").trim();

  if (!name) return "U";

  // USER_INFO may store names as "Last Name, First Name".
  if (name.includes(",")) {
    const firstNamePart = name.split(",")[1].trim();
    if (firstNamePart) return firstNamePart.charAt(0).toUpperCase();
  }

  return name.split(/\s+/)[0].charAt(0).toUpperCase();
};
