import "babel-polyfill";

async function getData() {
  const resp = await fetch("/api/v1/admin/data");
  if (!resp.ok) {
    throw new Error(`HTTP status ${resp.status}`);
  }
  const data = await resp.json();
  return data;
}

async function setData(data) {
  const resp = await fetch("/api/v1/admin/data", {
    method: "post",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!resp.ok) {
    throw new Error(`HTTP status ${resp.status}`);
  }
}

async function main() {
  const data = await getData();
  console.log(data);
}

main().catch(console.error);
