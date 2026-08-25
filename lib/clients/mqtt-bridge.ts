export async function publishMqtt(options: {
  broker: string;
  topic: string;
  message: string;
}): Promise<{
  published: boolean;
  notes: string[];
  error?: string;
}> {
  const notes = [
    "MQTT runs over TCP/TLS, not HTTP. This bridge shows what a gateway would publish.",
    `CONNECT ${options.broker}`,
    `PUBLISH topic="${options.topic}" payload=${JSON.stringify(options.message)}`,
  ];

  try {
    const mqtt = await import("mqtt");
    const client = mqtt.connect(options.broker, {
      connectTimeout: 5000,
      reconnectPeriod: 0,
    });

    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("MQTT connect timeout")), 6000);
      client.on("connect", () => {
        clearTimeout(t);
        client.publish(options.topic, options.message, {}, (err) => {
          if (err) reject(err);
          else client.end(false, {}, () => resolve());
        });
      });
      client.on("error", (err) => {
        clearTimeout(t);
        reject(err);
      });
    });

    notes.push("Live publish succeeded.");
    return { published: true, notes };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    notes.push(`Live publish skipped: ${error}`);
    return { published: false, notes, error };
  }
}
