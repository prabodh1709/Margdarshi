import type { DayMetrics } from '../types'

export interface Motivation {
  message: string
  hindi: string
  shloka: string
  attribution: string
  meaning: string
  explanation: string
  apply: string
}

const collection: Motivation[] = [
  {
    message: 'The next focused session is more valuable than regret about the last one.',
    hindi: 'आज का लक्ष्य आसान होना नहीं है। आज का लक्ष्य कल से बेहतर होना है।',
    shloka: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।', attribution: 'भगवद्गीता 2.47',
    meaning: 'तुम्हारा अधिकार केवल कर्म करने में है, फल पर नहीं।',
    explanation: 'Result pressure weakens attention. Return to the work directly in front of you.',
    apply: 'Choose one GATE block and protect it from distraction until it is finished.',
  },
  {
    message: 'Discipline is quiet: it looks like beginning on time, especially when no one is watching.',
    hindi: 'अनुशासन वह निर्णय है जो मन के बहानों से बड़ा होता है।',
    shloka: 'उद्धरेदात्मनाऽऽत्मानं नात्मानमवसादयेत्।', attribution: 'भगवद्गीता 6.5',
    meaning: 'मनुष्य को स्वयं अपने द्वारा अपना उद्धार करना चाहिए, स्वयं को गिराना नहीं चाहिए।',
    explanation: 'Your routine is an instrument of self-support, not punishment.',
    apply: 'Start the next scheduled task within five minutes of its planned time.',
  },
  {
    message: 'Consistency compounds long before confidence arrives.',
    hindi: 'छोटे, पूरे किए गए वादे ही बड़े आत्मविश्वास की नींव हैं।',
    shloka: 'योगः कर्मसु कौशलम्।', attribution: 'भगवद्गीता 2.50',
    meaning: 'कर्मों में कुशलता ही योग है।',
    explanation: 'Careful, repeatable execution is a meaningful form of practice.',
    apply: 'Finish one PYQ set, record the learning, then take the planned break.',
  },
]

export const motivationFor = (day: DayMetrics, name: string): Motivation & { aiMessage: string } => {
  const base = collection[Math.abs(day.date.split('-').join('').split('').reduce((a, b) => a + Number(b), 0)) % collection.length]
  let aiMessage = `Good morning, ${name}. Begin with the next honest block, not an idealized day.`
  if (day.percent >= 80) aiMessage = `You have completed ${day.percent}% of today’s schedule. Protect this consistency with a calm finish.`
  else if (day.percent > 0 && day.gateMinutes < 180) aiMessage = 'आज का दिन अभी खत्म नहीं हुआ। अगला session सिर्फ PYQs को दे दो.'
  else if (day.completedTasks > 0) aiMessage = 'You have started. Complete the next important task before looking for a new plan.'
  return { ...base, aiMessage }
}
