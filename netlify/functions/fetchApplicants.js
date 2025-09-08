// netlify/functions/fetchApplicants.js
// import fetch from "node-fetch";

export async function handler() {
  const domain = process.env.KINTONE_DOMAIN;
  const appId = process.env.KINTONE_APP_ID;
  const apiToken = process.env.KINTONE_API_TOKEN;

  try {
    const url = `https://${domain}/k/v1/records.json?app=${appId}&query=order by Record_number desc`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-Cybozu-API-Token": apiToken,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: "Kintone API error", details: errText }),
      };
    }

    const data = await response.json();

    // Only return the fields we care about
    const applicants = data.records.map((r) => ({
      fullName: r.Full_Name?.value || "",
      position: r.Position?.value || "",
      status: r.Status?.value || "",
      createdAt: r.Created_datetime?.value || "",
      email: r.Email?.value || "",
      phone: r.Phone?.value || "",
      education: r.Education?.value || "",
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(applicants),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
