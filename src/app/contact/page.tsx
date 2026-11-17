"use client";

import React, { useMemo, useState } from "react";
import content from "@/content.json";
import { Media } from "@/components/Media";
import { WriteReveal } from "@/components/WriteReveal";

const TOPICS = [
  "Leadership & Student Governance",
  "Northern Kenya CBO Mentorship",
  "Speaking & Panel Invitation",
  "Medical & Community Partnership",
];

function buildWhatsAppUrl(phoneRaw: string, text: string): string {
  const digits = phoneRaw.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export default function ContactPage() {
  const { contact, owner } = content;
  const [selectedPhone, setSelectedPhone] = useState(contact.phones[0]);
  const [senderName, setSenderName] = useState("");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState(
    "Hello Abdikhaliq (SG_AKASH), I visited your portfolio and would like to connect regarding student leadership and community initiatives.",
  );

  const composedPayload = useMemo(() => {
    const prefix = senderName.trim()
      ? `Hi Abdikhaliq — I'm ${senderName.trim()} (${topic}).\n\n`
      : `Topic: ${topic}\n\n`;
    return `${prefix}${message.trim()}`;
  }, [senderName, topic, message]);

  const whatsAppHref = buildWhatsAppUrl(selectedPhone, composedPayload);

  return (
    <div className="subpage-wrap">
      <section className="band subpage-hero">
        <div className="band-inner">
          <p className="mono-label">{contact.kicker} · {owner.school}</p>
          <WriteReveal
            as="h1"
            text={contact.headline}
            className="hero-headline"
            style={{ marginTop: "0.75rem" }}
            autoReveal
          />
          <WriteReveal
            text={contact.text}
            className="lead-copy"
            style={{ marginTop: "1.4rem" }}
            autoReveal
          />

          <div className="contact-giant-list">
            <div className="contact-giant-line" style={{ borderTop: 0, paddingBottom: "1rem" }}>
              <span className="mono-label">Official Channel</span>
              <span>Abdikhaliq Abdi · @akash_icekid</span>
            </div>
            <a href="https://www.instagram.com/akash_icekid" target="_blank" rel="noopener noreferrer" className="contact-giant-line">
              <span className="mono-label">Instagram Channel ↗</span>
              <span>@akash_icekid</span>
            </a>
            <a href={`mailto:${contact.email}`} className="contact-giant-line">
              <span className="mono-label">Email Dispatch</span>
              <span>{contact.email}</span>
            </a>

            {contact.phones.map((phone, i) => (
              <a
                key={phone}
                href={buildWhatsAppUrl(phone, composedPayload)}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-giant-line"
              >
                <span className="mono-label">WhatsApp 0{i + 1} ↗</span>
                <span>{phone}</span>
              </a>
            ))}

            <a href="https://www.tiktok.com/@sg_akash" target="_blank" rel="noopener noreferrer" className="contact-giant-line">
              <span className="mono-label">TikTok Archive ↗</span>
              <span>{contact.tiktok}</span>
            </a>
          </div>

          <div className="whatsapp-composer" aria-label="WhatsApp message form">
            <div className="composer-head">
              <p className="mono-label">Direct WhatsApp Inquiry · Prefilled Dispatch</p>
              <h2 className="section-heading">Write to <em>{owner.shortName}.</em></h2>
            </div>

            <div className="composer-grid">
              <div className="composer-field">
                <label htmlFor="wa-name" className="mono-label">
                  Your Name
                </label>
                <input
                  id="wa-name"
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Optional name or organization"
                  className="composer-input"
                />
              </div>

              <div className="composer-field">
                <label htmlFor="wa-line" className="mono-label">
                  WhatsApp Line
                </label>
                <select
                  id="wa-line"
                  value={selectedPhone}
                  onChange={(e) => setSelectedPhone(e.target.value)}
                  className="composer-input"
                >
                  {contact.phones.map((p, idx) => (
                    <option key={p} value={p}>
                      Line 0{idx + 1} — {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="composer-topics" role="group" aria-label="Inquiry subject">
              {TOPICS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTopic(t)}
                  className={`composer-topic-btn ${topic === t ? "is-active" : ""}`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="composer-field">
              <label htmlFor="wa-message" className="mono-label">
                Message (Prefilled &amp; Editable)
              </label>
              <textarea
                id="wa-message"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="composer-textarea"
              />
            </div>

            <div className="composer-actions">
              <a
                href={whatsAppHref}
                target="_blank"
                rel="noopener noreferrer"
                className="hold-cta is-locked"
              >
                <span className="hold-cta-text">
                  Send via WhatsApp ({selectedPhone}) ↗
                </span>
              </a>
              <span className="mono-label">
                Opens WhatsApp chat with your drafted message ready
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="band-inner">
          <p className="mono-label">Latest from {owner.handle} · Drag or scroll horizontally</p>
          <div className="social-strip">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`social-card tilt-card-${i % 3}`}>
                <Media slot={`social-posts-${i + 1}`} variant="duotone" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
