let activeSessionId: string | undefined

export async function queryAgent(question: string) {
  const res = await fetch('/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: question,
      session_id: activeSessionId,
    }),
  })

  if (!res.ok) throw new Error(`Server error: ${res.status}`)

  const data = await res.json()

  if (data.session_id) {
    activeSessionId = data.session_id
  }

  return {
    response: data.response,
    status: data.status,
    session_id: data.session_id,
    widgets: data.widgets || [],
  }
}
