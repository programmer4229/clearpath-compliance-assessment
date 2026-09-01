import { db, AccountType } from "./db";

export function findUserByEmail(email: string) {
  return db.selectFrom("users").selectAll().where("email", "=", email).executeTakeFirst();
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  accountType: AccountType;
  affiliateCompany: string | null;
  isMarketer: boolean;
  isReviewer: boolean;
}) {
  return db
    .insertInto("users")
    .values({
      name: input.name,
      email: input.email,
      password_hash: input.passwordHash,
      account_type: input.accountType,
      affiliate_company: input.affiliateCompany,
      is_marketer: input.isMarketer,
      is_reviewer: input.isReviewer,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}
