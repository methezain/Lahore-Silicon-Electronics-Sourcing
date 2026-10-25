for (const url of ["http://localhost:4321/", "http://localhost:4322/", "http://localhost:4323/"]) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const html = await response.text();
    console.log(url, response.status, "toggle", html.includes("catalog-view"), "720", html.includes("720px"));
  } catch (error) {
    console.log(url, "FAIL", error.message);
  }
}
