import { createElement } from "react";

export default function Link({ href, children, ...props }) {
  return createElement("a", { href, ...props }, children);
}
