import fetchCookie from "fetch-cookie";
import config from "~/config.server";

let session: Promise<typeof fetch> | undefined;

declare global {
  var __session: Promise<typeof fetch> | undefined;
}

if (process.env.NODE_ENV !== "production") {
  session = global.__session;
}

const login = async (): Promise<typeof fetch> => {
  if (session) {
    return await session;
  }

  session = (async () => {
    console.log("Logging in");
    const fetcher = fetchCookie(fetch);
    const loginRedirect = await fetcher(
      "https://app.business.just-eat.co.uk/api/user/login?" +
        new URLSearchParams({
          email: config.justEat.email,
        })
    );

    if (!loginRedirect.ok) {
      console.log(await loginRedirect.text());
      throw new Error("Could not initiate login");
    }

    const loginPage = await loginRedirect.text();
    const loginUrl = loginPage
      .split('action="')[1]
      .split('"')[0]
      .split("&amp;")
      .join("&");
    const payload = new FormData();
    payload.append("username", config.justEat.email);
    payload.append("password", config.justEat.password);
    payload.append("rememberMe", "On");
    payload.append("credentialId", "");

    const loginResponse = await fetcher(loginUrl, {
      method: "POST",
      body: new URLSearchParams([...payload.entries()] as string[][]),
    });
    const response = await loginResponse.text();
    if (!loginResponse.ok || response.toLowerCase().includes("login")) {
      console.log(response);
      throw new Error("Failed to login");
    }

    console.log("Successful auth");

    return fetcher;
  })();

  if (process.env.NODE_ENV !== "production") {
    global.__session = session;
  }

  return await session;
};

export const sessionedFetch: typeof fetch = async (input, init) => {
  let attempts = 0;
  while (attempts < 2) {
    const authedFetch = await login().catch((e) => {
      console.log(e);
      return undefined;
    });

    if (!authedFetch) {
      continue;
    }

    const response = await authedFetch(input, init);
    if (response.status == 401) {
      // clear the session
      session = undefined;
    } else {
      return response;
    }
  }
  throw new Error("Could not authenticate request");
};
