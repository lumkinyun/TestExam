import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

// Explicit Gmail OAuth callback route placeholder to be implemented in Task 13
// http.route({
//   path: "/oauth/callback",
//   method: "GET",
//   handler: ...
// });

export default http;
