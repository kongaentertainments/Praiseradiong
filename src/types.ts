export interface RadioStation {
  id: string;
  name: string;
  url: string;
  genre: string;
  description: string;
  cover: string;
}

export interface Program {
  id: string;
  title: string;
  host: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  description: string;
}

export interface PlayerState {
  currentStation: RadioStation | null;
  isPlaying: boolean;
  volume: number;
}
