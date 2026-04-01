'use strict';
/**
 * ════════════════════════════════════════════════════════
 *  mediasoup-server/src/mediasoup/__tests__/Room.test.js
 *  Basic smoke tests for Room signaling event flow
 * ════════════════════════════════════════════════════════
 */

// Mock mediasoup so tests run without native binaries
jest.mock('mediasoup', () => ({
  createWorker: jest.fn().mockResolvedValue({
    pid: 9999,
    on: jest.fn(),
    close: jest.fn(),
    getResourceUsage: jest.fn().mockResolvedValue({ ru_maxrss: 1024 }),
    createRouter: jest.fn().mockResolvedValue({
      rtpCapabilities: { codecs: [], headerExtensions: [] },
      close: jest.fn(),
      canConsume: jest.fn().mockReturnValue(true),
      createWebRtcTransport: jest.fn().mockResolvedValue({
        id: 'transport-1',
        iceParameters: {},
        iceCandidates: [],
        dtlsParameters: {},
        sctpParameters: null,
        on: jest.fn(),
        connect: jest.fn(),
        produce: jest.fn().mockResolvedValue({
          id: 'producer-1',
          kind: 'audio',
          on: jest.fn(),
          pause: jest.fn(),
          resume: jest.fn(),
          close: jest.fn(),
        }),
        consume: jest.fn().mockResolvedValue({
          id: 'consumer-1',
          kind: 'audio',
          rtpParameters: {},
          type: 'simple',
          producerPaused: false,
          on: jest.fn(),
          resume: jest.fn(),
        }),
        setMaxIncomingBitrate: jest.fn(),
        close: jest.fn(),
      }),
    }),
  }),
}));

const Room = require('../Room');

describe('Room', () => {
  let room;
  let mockRouter;

  beforeEach(() => {
    mockRouter = {
      rtpCapabilities: { codecs: [], headerExtensions: [] },
      close: jest.fn(),
      canConsume: jest.fn().mockReturnValue(true),
      createWebRtcTransport: jest.fn().mockResolvedValue({
        id: 'transport-1',
        iceParameters: { usernameFragment: 'abc', password: 'xyz', iceLite: false },
        iceCandidates: [],
        dtlsParameters: { fingerprints: [] },
        sctpParameters: null,
        on: jest.fn(),
        connect: jest.fn().mockResolvedValue(),
        produce: jest.fn().mockResolvedValue({
          id: 'producer-1',
          kind: 'audio',
          on: jest.fn(),
          pause: jest.fn().mockResolvedValue(),
          resume: jest.fn().mockResolvedValue(),
          close: jest.fn(),
        }),
        consume: jest.fn().mockResolvedValue({
          id: 'consumer-1',
          kind: 'audio',
          rtpParameters: {},
          type: 'simple',
          producerPaused: false,
          on: jest.fn(),
          resume: jest.fn().mockResolvedValue(),
        }),
        setMaxIncomingBitrate: jest.fn().mockResolvedValue(),
        close: jest.fn(),
      }),
    };
    room = new Room('test-room', mockRouter);
  });

  test('addPeer and hasPeer', () => {
    room.addPeer('peer-1', { socketId: 's1', userId: 1, username: 'alice' });
    expect(room.hasPeer('peer-1')).toBe(true);
    expect(room.getPeerCount()).toBe(1);
  });

  test('removePeer empties room', () => {
    room.addPeer('peer-1', { socketId: 's1', userId: 1, username: 'alice' });
    room.removePeer('peer-1');
    expect(room.hasPeer('peer-1')).toBe(false);
    expect(room.isEmpty()).toBe(true);
  });

  test('createWebRtcTransport returns params', async () => {
    room.addPeer('peer-1', { socketId: 's1', userId: 1, username: 'alice' });
    const params = await room.createWebRtcTransport('peer-1');
    expect(params).toHaveProperty('id');
    expect(params).toHaveProperty('iceParameters');
    expect(params).toHaveProperty('iceCandidates');
    expect(params).toHaveProperty('dtlsParameters');
  });

  test('produce returns producerId', async () => {
    room.addPeer('peer-1', { socketId: 's1', userId: 1, username: 'alice' });
    await room.createWebRtcTransport('peer-1');
    const producerId = await room.produce('peer-1', 'transport-1', {
      kind: 'audio',
      rtpParameters: {},
    });
    expect(producerId).toBe('producer-1');
  });

  test('getOtherPeersProducers excludes self', async () => {
    room.addPeer('peer-1', { socketId: 's1', userId: 1, username: 'alice' });
    room.addPeer('peer-2', { socketId: 's2', userId: 2, username: 'bob' });
    await room.createWebRtcTransport('peer-1');
    await room.produce('peer-1', 'transport-1', { kind: 'audio', rtpParameters: {} });
    const others = room.getOtherPeersProducers('peer-2');
    expect(others.length).toBe(1);
    expect(others[0].peerId).toBe('peer-1');
  });

  test('getInfo returns correct structure', () => {
    room.addPeer('peer-1', { socketId: 's1', userId: 1, username: 'alice' });
    const info = room.getInfo();
    expect(info.id).toBe('test-room');
    expect(info.peerCount).toBe(1);
    expect(Array.isArray(info.peers)).toBe(true);
  });
});
