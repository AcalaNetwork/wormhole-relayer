import { describe, expect, it } from 'vitest';

import {
  EUPHRATES_POOLS,
} from '../../consts';
import { RouteParamsEuphrates } from '../../utils';
import {
  expectError,
  shouldRouteEuphrates,
} from '../testUtils';

describe.concurrent.skip('/shouldRouteEuphrates', () => {
  const recipient = '0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6';

  const testShouldRouteEuphrates = async (params: RouteParamsEuphrates) => {
    let res = await shouldRouteEuphrates(params);
    expect(res).toMatchSnapshot();

    // should be case insensitive
    res = await shouldRouteEuphrates({
      ...params,
      recipient: params.recipient.toLocaleLowerCase(),
    });
    expect(res).toMatchSnapshot();
  };

  it('when should route', async () => {
    for (const poolId of EUPHRATES_POOLS) {
      await testShouldRouteEuphrates({
        recipient,
        poolId,
      });
    }
  });

  describe('when should not route', () => {
    it('when missing params', async () => {
      try {
        await shouldRouteEuphrates({
          recipient,
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['poolId is a required field'], 400);
      }

      try {
        await shouldRouteEuphrates({
          poolId: 0,
        });
        expect.fail('did not throw an err');
      } catch (err) {
        expectError(err, ['recipient is a required field'], 400);
      }
    });

    it('when bad params', async () => {
      const res = await shouldRouteEuphrates({
        recipient,
        poolId: 520,
      });
      expect(res).toMatchInlineSnapshot(`
        {
          "data": {
            "msg": "euphrates poolId 520 is not supported",
            "shouldRoute": false,
          },
        }
      `);
    });
  });
});
