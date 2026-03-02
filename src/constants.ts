import { RadioStation, Program } from "./types";

export const STATIONS: RadioStation[] = [
  {
    id: "praiseradio-live",
    name: "PraiseRadioNG Live",
    url: "https://stream.zeno.fm/9xwv2tuzoqsuv",
    genre: "Variety / Live",
    description: "The official live broadcast of PraiseRadioNG.",
    cover: "https://picsum.photos/seed/praise/400/400",
  },
  {
    id: "lofi",
    name: "Lofi Girl",
    url: "https://icecast.radiofrance.fr/fip-hifi.aac", // Using FIP as a high-quality placeholder
    genre: "Lofi / Chill",
    description: "Relaxing beats for studying and focus.",
    cover: "https://picsum.photos/seed/lofi/400/400",
  },
  {
    id: "jazz",
    name: "Smooth Jazz",
    url: "https://icecast.radiofrance.fr/fipjazz-hifi.aac",
    genre: "Jazz",
    description: "The best of classic and contemporary jazz.",
    cover: "https://picsum.photos/seed/jazz/400/400",
  },
  {
    id: "electronic",
    name: "Electro Pulse",
    url: "https://icecast.radiofrance.fr/fipelectro-hifi.aac",
    genre: "Electronic",
    description: "Upbeat electronic and house music.",
    cover: "https://picsum.photos/seed/electro/400/400",
  },
  {
    id: "rock",
    name: "Rock Classics",
    url: "https://icecast.radiofrance.fr/fiprock-hifi.aac",
    genre: "Rock",
    description: "Legendary rock anthems from all eras.",
    cover: "https://picsum.photos/seed/rock/400/400",
  },
  {
    id: "world",
    name: "World Grooves",
    url: "https://icecast.radiofrance.fr/fipworld-hifi.aac",
    genre: "World",
    description: "Global sounds and diverse rhythms.",
    cover: "https://picsum.photos/seed/world/400/400",
  }
];

export const SCHEDULE: Program[] = [
  {
    id: "morning-praise",
    title: "Morning Praise",
    host: "Sarah Johnson",
    startTime: "06:00",
    endTime: "09:00",
    description: "Start your day with uplifting music and morning prayers."
  },
  {
    id: "mid-day-melodies",
    title: "Mid-Day Melodies",
    host: "Michael Chen",
    startTime: "09:00",
    endTime: "12:00",
    description: "A gentle mix of contemporary Christian music for your workday."
  },
  {
    id: "hope-journey",
    title: "Hope for the Journey",
    host: "Pastor David",
    startTime: "12:00",
    endTime: "15:00",
    description: "Deep insights and music that strengthens your faith and community."
  },
  {
    id: "afternoon-drive",
    title: "Afternoon Drive",
    host: "Jessica Williams",
    startTime: "15:00",
    endTime: "18:00",
    description: "Upbeat tracks and traffic updates to get you home safely."
  },
  {
    id: "evening-worship",
    title: "Evening Worship",
    host: "The Worship Team",
    startTime: "18:00",
    endTime: "21:00",
    description: "A dedicated time for worship and reflection."
  },
  {
    id: "night-light",
    title: "Night Light",
    host: "Grace Miller",
    startTime: "21:00",
    endTime: "00:00",
    description: "Calming music and late-night thoughts to end your day."
  }
];
