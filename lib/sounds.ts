'use client'

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)()
  } catch { return null }
}

function beep(freq: number, duration: number, volume = 0.3, type: OscillatorType = 'sine') {
  const ac = ctx()
  if (!ac) return
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.frequency.value = freq
  osc.type = type
  gain.gain.setValueAtTime(volume, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration)
  osc.start(ac.currentTime)
  osc.stop(ac.currentTime + duration)
}

function playFile(path: string, loop = false): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  try {
    const audio = new Audio(path)
    audio.loop = loop
    audio.play().catch(() => null)
    return audio
  } catch { return null }
}

export const sounds = {
  // Отправка сообщения — короткий тик
  messageSent() {
    beep(1200, 0.08, 0.15, 'sine')
  },

  // Получение сообщения когда чат открыт — тихий двойной тик
  messageInChat() {
    beep(880, 0.06, 0.1, 'sine')
    setTimeout(() => beep(1100, 0.06, 0.1, 'sine'), 80)
  },

  // Получение сообщения когда чат не активен — файл
  messageOutChat() {
    playFile('/sounds/message-out-chat.mp3')
  },

  // Начало записи голосового
  voiceStart() {
    beep(440, 0.15, 0.2, 'sine')
  },

  // Отмена записи
  voiceCancel() {
    const ac = ctx()
    if (!ac) return
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.connect(gain); gain.connect(ac.destination)
    osc.frequency.setValueAtTime(600, ac.currentTime)
    osc.frequency.exponentialRampToValueAtTime(200, ac.currentTime + 0.2)
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.15, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2)
    osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.2)
  },

  // Отправка голосового
  voiceSent() {
    const ac = ctx()
    if (!ac) return
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.connect(gain); gain.connect(ac.destination)
    osc.frequency.setValueAtTime(400, ac.currentTime)
    osc.frequency.exponentialRampToValueAtTime(900, ac.currentTime + 0.15)
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.15, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15)
    osc.start(ac.currentTime); osc.stop(ac.currentTime + 0.15)
  },

  callRingtone(): () => void {
    const audio = playFile('/sounds/ringtone-incoming.mp3', true)
    return () => { if (audio) { audio.pause(); audio.currentTime = 0 } }
  },

  // Исходящий звонок (набор) — файл, зацикленный
  callOutgoing(): () => void {
    const audio = playFile('/sounds/ringtone-outgoing.mp3', true)
    return () => { if (audio) { audio.pause(); audio.currentTime = 0 } }
  },

  // Звонок принят
  callConnected() {
    playFile('/sounds/call-connect.mp3')
  },

  // Звонок завершён
  callEnded() {
    playFile('/sounds/call-end.mp3')
  },
}
