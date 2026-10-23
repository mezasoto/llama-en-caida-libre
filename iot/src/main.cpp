#include <Arduino.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

#include "secrets.h"

#ifndef IOT_INGEST_TOKEN
#error "Define IOT_INGEST_TOKEN in iot/secrets.h"
#endif

namespace {

constexpr char kWifiSsid[] = "Wokwi-GUEST";
constexpr char kApiUrl[] =
    "https://llama-en-caida-libre-api.onrender.com/api/telemetry";
constexpr char kDeviceId[] = "esp32-wokwi-demo";
constexpr uint8_t kTemperaturePotPin = 34;
constexpr uint8_t kSmokePotPin = 35;
constexpr uint8_t kFlameButtonPin = 18;
constexpr unsigned long kSendIntervalMs = 10000;

unsigned long lastSendAt = 0;

void connectWifi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(kWifiSsid, "", 6);
  Serial.print("Conectando a Wokwi-GUEST");

  while (WiFi.status() != WL_CONNECTED) {
    delay(300);
    Serial.print('.');
  }

  Serial.printf("\nWiFi conectado; IP: %s\n", WiFi.localIP().toString().c_str());
}

void sendTelemetry() {
  const int temperatureRaw = analogRead(kTemperaturePotPin);
  const int smokeRaw = analogRead(kSmokePotPin);
  const float temperatureC = 15.0f + (temperatureRaw / 4095.0f) * 70.0f;
  const int smokePpm = static_cast<int>((smokeRaw / 4095.0f) * 1000.0f);
  const bool flameDetected = digitalRead(kFlameButtonPin) == LOW;

  char payload[192];
  snprintf(
      payload,
      sizeof(payload),
      "{\"device_id\":\"%s\",\"temperature_c\":%.1f,"
      "\"smoke_ppm\":%d,\"flame_detected\":%s}",
      kDeviceId,
      temperatureC,
      smokePpm,
      flameDetected ? "true" : "false");

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  if (!http.begin(client, kApiUrl)) {
    Serial.println("No se pudo iniciar la solicitud HTTPS.");
    return;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-ingest-token", IOT_INGEST_TOKEN);
  const int responseCode = http.POST(payload);
  const String responseBody = http.getString();

  Serial.printf(
      "POST telemetria: HTTP %d | temp=%.1f C | humo=%d ppm | llama=%s\n",
      responseCode,
      temperatureC,
      smokePpm,
      flameDetected ? "si" : "no");
  if (responseBody.length() > 0) {
    Serial.println(responseBody);
  }

  http.end();
}

}  // namespace

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  pinMode(kFlameButtonPin, INPUT_PULLUP);
  connectWifi();
  sendTelemetry();
  lastSendAt = millis();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
  }

  if (millis() - lastSendAt >= kSendIntervalMs) {
    sendTelemetry();
    lastSendAt = millis();
  }

  delay(50);
}