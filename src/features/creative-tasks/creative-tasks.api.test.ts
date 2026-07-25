import { afterEach, describe, expect, it, vi } from 'vitest'
import { creativeTasksApi, isClosedCreativeTask, type CreativeTask } from './creative-tasks.api'

describe('creativeTasksApi', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('creates, lists and updates resumable creative tasks', async () => {
    const task: CreativeTask = { id: 'task-1', productId: null, productName: '青瓷杯', platform: '小红书', title: '标题', sellingPoints: [], body: '正文', status: 'editing', failureReason: '', createdAt: '', updatedAt: '' }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: task }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [task] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { ...task, title: '新标题' } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)

    await creativeTasksApi.create(task)
    await creativeTasksApi.listActive()
    await creativeTasksApi.update(task.id, { ...task, title: '新标题' })

    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/creative-tasks', undefined)
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/creative-tasks/task-1', expect.objectContaining({ method: 'PUT' }))
  })

  it('starts a new task when the previous task is exporting or completed', () => {
    expect(isClosedCreativeTask('exporting')).toBe(true)
    expect(isClosedCreativeTask('completed')).toBe(true)
    expect(isClosedCreativeTask('editing')).toBe(false)
  })
})
