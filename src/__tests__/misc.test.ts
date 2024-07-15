import { describe, expect, it } from 'vitest';
import { expectError, health, noRoute, routeHoma, shouldRouteHoma, testTimeout, version } from './testUtils';

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

  describe.only('/multiple simaltaneous shouldRoute', () => {
    it('works', async () => {
      const routeParams = {
        destAddr: '0x75E480dB528101a381Ce68544611C169Ad7EB342',
        chain: 'acala',
      };

      const routePending = routeHoma(routeParams);

      const pendings = [] as any[];
      for (let i = 0; i < 10; i++) {
        pendings.push(shouldRouteHoma(routeParams));
      }

      const res = await Promise.all(pendings);

      const routeRes = await routePending;
      console.log(routeRes)

      console.log(res);
    });
  });
});
