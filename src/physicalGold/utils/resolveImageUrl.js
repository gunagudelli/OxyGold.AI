// Product/category images come back from the backend as bare S3 object keys
// (e.g. "products/123/front.png") rather than full URLs, which is why
// <Image source={{ uri }}> silently fails to load them. Prefix anything that
// isn't already an absolute URL with the bucket's public base URL.
const S3_BASE_URL = "https://oxyloansv1.s3.ap-south-1.amazonaws.com";

export const resolveImageUrl = (path) => {
  if (!path || typeof path !== "string") return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${S3_BASE_URL}/${path.replace(/^\/+/, "")}`;
};
