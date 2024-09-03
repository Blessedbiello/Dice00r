import { ACTIONS_CORS_HEADERS, createActionHeaders, type ActionsJson } from "@solana/actions";

export const GET = async () => {
  const payload: ActionsJson = {
    rules: [
      // map all root level routes to an action
      // {
      //   pathPattern: "/dice00r/*",
      //   apiPath: "/api/actions/dice00r*",
      // },
      // idempotent rule as the fallback
      {
        pathPattern: "/dice00r/*",
        apiPath: "/api/actions/dice00r/*",
      },
    ],
  };

  return Response.json(payload, {
    // headers: ACTIONS_CORS_HEADERS,
    headers: createActionHeaders(),
  });
};

// DO NOT FORGET TO INCLUDE THE `OPTIONS` HTTP METHOD
// THIS WILL ENSURE CORS WORKS FOR BLINKS
export const OPTIONS = GET;