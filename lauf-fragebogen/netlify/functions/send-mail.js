// Diese Funktion läuft serverseitig bei Netlify (nicht im Browser).
// Sie nimmt die Formular-Daten entgegen und verschickt sie per Resend
// als E-Mail inklusive Foto-Anhang an die hinterlegte Empfänger-Adresse.

const { Resend } = require("resend");

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const data = JSON.parse(event.body);

    // Foto (falls vorhanden) aus dem Data-URL-Format herauslösen
    const attachments = [];
    if (data.foto_base64) {
      const match = data.foto_base64.match(/^data:(.+);base64,(.+)$/);
      if (match) {
        attachments.push({
          filename: data.foto_dateiname || "streckenverlauf.jpg",
          content: match[2], // reiner Base64-String, ohne "data:...;base64," Präfix
        });
      }
    }

    const result = await resend.emails.send({
      // Diese Absenderadresse funktioniert ohne eigene Domain-Verifizierung.
      // Für eine eigene Absenderadresse (z.B. studie@deine-domain.de) muss
      // in Resend eine eigene Domain verifiziert werden.
      from: "Laufstudie <onboarding@resend.dev>",
      to: process.env.STUDY_RECEIVER_EMAIL,
      subject: `Neue Einreichung – Kennnummer ${data.kennnummer || "unbekannt"}`,
      text: data.zusammenfassung || "Keine Zusammenfassung übermittelt.",
      attachments,
    });

    if (result.error) {
      throw new Error(result.error.message || "Resend hat einen Fehler zurückgegeben.");
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error("Fehler beim Versand:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
