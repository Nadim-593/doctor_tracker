export function databaseConnectionHint(error) {
  const name = error?.name || "";
  const code = error?.code;
  const codeName = error?.codeName || "";
  const message = String(error?.message || "").toLowerCase();

  if (
    code === 18 ||
    codeName === "AuthenticationFailed" ||
    /authentication failed|bad auth|auth failed/.test(message)
  ) {
    return "MongoDB authentication failed. Verify the Atlas database user and URL-encode special characters in the connection URL password.";
  }
  if (name === "MongoParseError" || name === "MongoInvalidArgumentError") {
    return "The MongoDB URL could not be parsed. Check its mongodb:// or mongodb+srv:// format, credentials encoding, and database name.";
  }
  if (
    name.includes("ServerSelection") ||
    name === "MongoNetworkError" ||
    ["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT"].includes(error?.cause?.code)
  ) {
    return "MongoDB is unreachable. Check that the Atlas cluster is active, this host is allowed by Atlas Network Access, and DNS/outbound network access works.";
  }
  return "MongoDB connection failed. Verify MONGODB_URI, Atlas database user permissions, and cluster availability.";
}
