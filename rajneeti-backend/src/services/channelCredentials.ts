/**
 * Which account a upload goes to.
 *
 * Until now `socialUploadService` read `process.env.INSTAGRAM_ACCESS_TOKEN`
 * inside each method, so there was exactly one account and no way to express a
 * second. With two channels that is not just inconvenient — it is the setup
 * where a money-channel reel gets posted to the Rajneeti game's Instagram, and
 * nobody notices until a follower does.
 *
 * The rule that prevents it: **a named channel never falls back to another
 * channel's credentials.** If the money channel's token is missing, resolving
 * it throws. It does not quietly borrow the global one and post to the game.
 */

export interface ChannelCredentials {
    /** Only used in log lines, so a run says which account it is touching. */
    channel: string;
    igToken: string;
    igUserId: string;
    /**
     * Facebook Page token. Meta lets the same token serve both, and the old
     * code relied on that implicitly by reading INSTAGRAM_ACCESS_TOKEN for
     * Facebook. Kept as its own field so a channel CAN separate them.
     */
    fbPageToken: string;
}

export type ChannelName = 'rajneeti' | 'money';

/** Reads a var, throwing with a useful message rather than returning undefined. */
const required = (name: string, channel: string): string => {
    const value = process.env[name];
    if (!value?.trim()) {
        throw new Error(
            `[credentials] ${name} is not set, so the "${channel}" channel cannot publish. ` +
                'Add it as a GitHub secret. Refusing to fall back to another channel\'s ' +
                'token — that would post this content to the wrong account.',
        );
    }
    return value.trim();
};

/**
 * Credentials for a named channel.
 *
 * Rajneeti keeps the original unprefixed variable names so nothing that already
 * works has to be touched. Money uses `__MONEY`-suffixed names.
 */
export function resolveChannel(channel: ChannelName): ChannelCredentials {
    if (channel === 'money') {
        const igToken = required('IG_TOKEN__MONEY', channel);
        return {
            channel,
            igToken,
            igUserId: required('IG_USER_ID__MONEY', channel),
            // Same token unless the setup deliberately separated them.
            fbPageToken: process.env.FB_PAGE_TOKEN__MONEY?.trim() || igToken,
        };
    }

    const igToken = required('INSTAGRAM_ACCESS_TOKEN', channel);
    return {
        channel,
        igToken,
        igUserId: required('INSTAGRAM_USER_ID', channel),
        fbPageToken: process.env.FACEBOOK_PAGE_TOKEN?.trim() || igToken,
    };
}

/**
 * The legacy path: globals, with missing values reported rather than thrown.
 *
 * Used only when a caller passes no channel at all, which is every existing
 * Rajneeti call site. Returns null instead of throwing so those keep their
 * warn-and-skip behaviour exactly as before.
 */
export function resolveLegacy(): ChannelCredentials | null {
    const igToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
    const igUserId = process.env.INSTAGRAM_USER_ID?.trim();
    if (!igToken || !igUserId) return null;
    return { channel: 'rajneeti (legacy env)', igToken, igUserId, fbPageToken: igToken };
}

/**
 * Thrown when Meta reports the token is dead (code 190).
 *
 * This is deliberately an exception rather than a `false` return. An expired
 * Meta token takes Instagram AND Facebook down together, because the same token
 * serves both — and the old code logged it and carried on, which is precisely
 * how a pipeline appears to run fine for weeks while publishing nothing.
 */
export class MetaTokenExpiredError extends Error {
    constructor(channel: string, detail: string) {
        super(
            `[credentials] The Meta access token for "${channel}" has expired or been revoked. ` +
                'Instagram and Facebook both stop working when this happens, because they share ' +
                'the token. Generate a new one — a Business Manager System User token does not ' +
                `expire. Meta said: ${detail}`,
        );
        this.name = 'MetaTokenExpiredError';
    }
}
