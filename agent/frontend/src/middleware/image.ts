export async function uploadImage(file: File) {
    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch('/upload-photo', {
    method: 'POST',
    body: formData,
    })

    if (!res.ok) throw new Error(`Server error: ${res.status}`)

    const data = await res.json()

    return {
        classification: data.classification,
        filename: data.filename,
        size: data.size,
        content_type: data.content_type,
        status: data.status,
    }
}
