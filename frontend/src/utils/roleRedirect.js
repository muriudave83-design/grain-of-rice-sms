export function getHomeRouteForRole(role) {
  switch (role) {
    case "ADMIN":
      return "/dashboard/admin";
    case "TEACHER":
      return "/teacher";
    case "PARENT":
      return "/parent";
    case "STUDENT":
      return "/student";
    default:
      return "/login";
  }
}
