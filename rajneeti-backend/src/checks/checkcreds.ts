/**
 * The one property worth asserting about two-channel credentials: a named
 * channel NEVER borrows another channel's token.
 *
 * The failure this guards is not a crash. It is the money channel's reel
 * appearing on the Rajneeti game's Instagram because a missing variable fell
 * back to the global one — a run that reports success while posting to the
 * wrong audience.
 */

import { resolveChannel, resolveLegacy, MetaTokenExpiredError } from '../services/channelCredentials.js';

let pass = 0, fail = 0;
const check = (l: string, c: boolean, x = '') => {
    console.log(`  ${c ? 'PASS' : 'FAIL'}  ${l}${x ? ' — ' + x : ''}`);
    c ? pass++ : fail++;
};

/** Runs `fn` with exactly `env` set, restoring everything afterwards. */
const withEnv = <T>(env: Record<string, string | undefined>, fn: () => T): T => {
    const keys = [
        'INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_USER_ID', 'FACEBOOK_PAGE_TOKEN',
        'IG_TOKEN__MONEY', 'IG_USER_ID__MONEY', 'FB_PAGE_TOKEN__MONEY',
    ];
    const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
    for (const k of keys) delete process.env[k];
    for (const [k, v] of Object.entries(env)) if (v !== undefined) process.env[k] = v;
    try {
        return fn();
    } finally {
        for (const k of keys) {
            if (saved[k] === undefined) delete process.env[k];
            else process.env[k] = saved[k]!;
        }
    }
};

const RAJNEETI = { INSTAGRAM_ACCESS_TOKEN: 'rajneeti-token', INSTAGRAM_USER_ID: '111111' };
const MONEY = { IG_TOKEN__MONEY: 'money-token', IG_USER_ID__MONEY: '999999' };

console.log('each channel resolves to its own account:');
withEnv({ ...RAJNEETI, ...MONEY }, () => {
    const money = resolveChannel('money');
    const raj = resolveChannel('rajneeti');
    check('money gets the money token', money.igToken === 'money-token');
    check('money gets the money account id', money.igUserId === '999999');
    check('rajneeti gets the rajneeti token', raj.igToken === 'rajneeti-token');
    check('the two never share a value', money.igToken !== raj.igToken && money.igUserId !== raj.igUserId);
});

console.log('\nTHE IMPORTANT ONE — no cross-channel fallback:');
// Both Rajneeti vars present, money vars absent. A fallback here would post
// money content to the game's Instagram.
withEnv(RAJNEETI, () => {
    try {
        const leaked = resolveChannel('money');
        check('money with no token of its own THROWS', false,
            `it returned ${leaked.igUserId} — that is the Rajneeti account`);
    } catch (e: any) {
        check('money with no token of its own THROWS', e.message.includes('IG_TOKEN__MONEY'));
        check('...and the error explains why it refuses', e.message.includes('wrong account'));
    }
});

withEnv({ ...RAJNEETI, IG_TOKEN__MONEY: 'money-token' }, () => {
    try {
        resolveChannel('money');
        check('a HALF-configured money channel also throws', false, 'it resolved with a missing account id');
    } catch (e: any) {
        check('a HALF-configured money channel also throws', e.message.includes('IG_USER_ID__MONEY'));
    }
});

withEnv(MONEY, () => {
    try {
        resolveChannel('rajneeti');
        check('rajneeti does not borrow the money token either', false);
    } catch (e: any) {
        check('rajneeti does not borrow the money token either', e.message.includes('INSTAGRAM_ACCESS_TOKEN'));
    }
});

console.log('\nFacebook token defaults to the Instagram one, per channel:');
withEnv(MONEY, () => {
    check('money FB falls back to the money IG token', resolveChannel('money').fbPageToken === 'money-token');
});
withEnv({ ...MONEY, FB_PAGE_TOKEN__MONEY: 'money-page-token' }, () => {
    check('an explicit FB token wins', resolveChannel('money').fbPageToken === 'money-page-token');
});

console.log('\nlegacy callers keep their old warn-and-skip behaviour:');
withEnv(RAJNEETI, () => {
    const legacy = resolveLegacy();
    check('globals present -> resolves', legacy?.igToken === 'rajneeti-token');
});
withEnv({}, () => {
    check('globals absent -> null, not a throw', resolveLegacy() === null);
});

console.log('\ntoken expiry is an exception, not a log line:');
const err = new MetaTokenExpiredError('money', 'Session has expired');
check('it is throwable and named', err instanceof Error && err.name === 'MetaTokenExpiredError');
check('it says both platforms are affected', err.message.includes('Instagram and Facebook both'));
check('it names the fix', err.message.includes('System User'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
