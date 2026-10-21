export function buildListQuery(query) {
  const filter = {};
  if (query.q) filter.$text = { $search: query.q };
  if (query.createdFrom || query.createdTo) {
    filter.createdAt = {};
    if (query.createdFrom) filter.createdAt.$gte = query.createdFrom;
    if (query.createdTo) filter.createdAt.$lte = query.createdTo;
  }
  return filter;
}

export function paginationOptions(query) {
  return {
    sort: { [query.sort]: query.order === "asc" ? 1 : -1, _id: query.order === "asc" ? 1 : -1 },
    skip: (query.page - 1) * query.limit,
    limit: query.limit,
  };
}

export function pageInfo(page, limit, total) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
