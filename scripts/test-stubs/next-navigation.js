export function useRouter() {
  return { push() {}, replace() {}, prefetch() {}, back() {} };
}

export function usePathname() {
  return "/register";
}

export function useSearchParams() {
  return new URLSearchParams();
}

export function redirect() {}
