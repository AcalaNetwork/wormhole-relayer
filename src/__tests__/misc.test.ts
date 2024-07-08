import { describe, expect, it } from 'vitest';
import { expectError, health, noRoute, testTimeout, version } from './testUtils';

describe.concurrent('/miscellaneous', () => {
  describe('when no route for the request', () => {
    it('throws correct error', async () => {
      try {
        await noRoute({});

        expect.fail('/noRoute did not throw when it should!');
      } catch (err) {
        expectError(err, 'POST /noRoute not supported', 404);
      }
    });
  });

  describe('/version', () => {
    it('works', async () => {
      const res = await version({});
      expect(res).to.not.be.undefined;
    });
  });

  describe('/testTimeout', () => {
    it('works', async () => {
      const startTime = Date.now();
      await testTimeout({
        timeout: 1000,
      });
      const endTime = Date.now();

      expect(endTime - startTime).to.be.gte(1000);
    });
  });

  describe('/health', () => {
    it('works', async () => {
      const res = await health({});

      expect(Number(res.data.relayerBalAcala)).to.be.gt(0);
      // expect(Number(res.data.relayerBalKarura)).to.be.gt(0);
      // expect(res.data.isHealthy).to.be.true;
    });
  });
});
