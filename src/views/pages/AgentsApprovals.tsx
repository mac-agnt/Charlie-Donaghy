import { Fragment } from "react";
import { arr, cat, css, cx, txt } from "../../runtime/template";

type Props = { v: any };

/* Approvals, moved from Work to sit under Agents. Same list and the same
   viewer as before; the requests are mostly agent proposals waiting on a person. */
export default function AgentsApprovals({ v }: Props) {
  const ap = v.approvalsPage;
  return (
    <div style={{"width":"100%","maxWidth":"1280px","margin":"0 auto","boxSizing":"border-box","padding":"22px 32px 40px","animation":"pageIn .7s var(--ease) both"}}>
      <div style={{"padding":"20px 4px 22px"}}>
        <div style={{"fontFamily":"var(--mono)","fontSize":"9.5px","letterSpacing":"0.16em","color":"var(--faint)"}}>
          {"AGENTS"}
        </div>
        <h1 style={{"margin":"8px 0 0","fontSize":"44px","fontWeight":"500","letterSpacing":"-1.8px","lineHeight":"1"}}>
          {txt(ap?.title)}
        </h1>
        <div style={{"fontSize":"14px","color":"var(--dim)","marginTop":"10px"}}>
          {txt(ap?.blurb)}
        </div>
        <div style={{"display":"flex","flexWrap":"wrap","gap":"18px 34px","alignItems":"center","marginTop":"22px"}}>
          {arr(ap?.stats).map((s: any, i: number) => (
            <Fragment key={i}>
              <div style={{"display":"flex","flexDirection":"column","justifyContent":"center","minWidth":"max-content"}}>
                <div style={{"display":"flex","alignItems":"center","gap":"7px","fontFamily":"var(--mono)","fontSize":"9.5px","letterSpacing":"0.13em","color":"var(--faint)","whiteSpace":"nowrap"}}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{"flex":"none"}}>
                    <path d={s?.icon} />
                  </svg>
                  {txt(s?.label)}
                </div>
                <div style={css(cat("font-family:var(--mono);font-size:34px;font-weight:var(--fig-weight,inherit);font-weight:500;letter-spacing:-1px;line-height:1.1;margin-top:4px;color:", s?.color))}>
                  {txt(s?.value)}
                </div>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
      <div style={{"display":"flex","flexWrap":"wrap","alignItems":"center","gap":"10px","padding":"0 4px 16px"}}>
        <div style={css(ap?.viewTrack)}>
          <span style={css(ap?.viewThumb)} />
          {arr(ap?.views).map((w: any, i: number) => (
            <Fragment key={i}>
              {w?.active && (
                <button onClick={w?.pick} style={{"position":"relative","zIndex":"1","display":"flex","alignItems":"center","justifyContent":"center","height":"32px","padding":"0 16px","border":"0","borderRadius":"var(--r-ctl,11px)","background":"none","color":"var(--pill-ink)","fontSize":"12.5px","fontWeight":"600","cursor":"pointer","whiteSpace":"nowrap","transition":"color .3s var(--ease)"}}>
                  {txt(w?.label)}
                </button>
              )}
              {w?.inactive && (
                <button className="ix3" onClick={w?.pick} style={{"position":"relative","zIndex":"1","display":"flex","alignItems":"center","justifyContent":"center","height":"32px","padding":"0 16px","border":"0","borderRadius":"var(--r-ctl,11px)","background":"none","color":"var(--dim)","fontSize":"12.5px","cursor":"pointer","whiteSpace":"nowrap","transition":"color .3s var(--ease)"}}>
                  {txt(w?.label)}
                </button>
              )}
            </Fragment>
          ))}
        </div>
      </div>
      <div style={{"display":"flex","flexDirection":"column","gap":"10px"}}>
        {arr(v.workApprovals).map((a: any, i30: number) => (
          <Fragment key={a?.id ?? i30}>
            <div className="ixx" style={{"background":"var(--surface)","border":"1px solid var(--border)","borderRadius":"var(--card-r,18px)","backdropFilter":"blur(20px) saturate(1.3)","boxShadow":"var(--card-shadow)","padding":"15px 18px","transition":"transform .26s var(--ease),border-color .22s var(--ease)"}}>
              <div style={{"display":"flex","alignItems":"flex-start","gap":"12px","flexWrap":"wrap"}}>
                <div style={{"flex":"1","minWidth":"220px"}}>
                  <div style={{"display":"flex","alignItems":"center","gap":"9px","flexWrap":"wrap"}}>
                    <span style={{"fontSize":"14px","fontWeight":"500"}}>
                      {txt(a?.title)}
                    </span>
                    <span style={css(a?.statusStyle)}>
                      {txt(a?.status)}
                    </span>
                  </div>
                  <div style={{"fontSize":"12px","color":"var(--dim)","marginTop":"4px"}}>
                    {txt(a?.subject)}
                  </div>
                </div>
                <span style={{"fontFamily":"var(--mono)","fontSize":"10.5px","color":"var(--faint)"}}>
                  {txt(a?.age)}
                </span>
              </div>
              <div style={{"display":"flex","flexWrap":"wrap","alignItems":"center","gap":"8px","marginTop":"12px"}}>
                {arr(a?.steps).map((s: any, i31: number) => (
                  <Fragment key={i31}>
                    <div style={{"display":"flex","alignItems":"center","gap":"7px","padding":"5px 10px","background":"var(--surface-2)","border":"1px solid var(--border)","borderRadius":"7px"}}>
                      <span style={css(cat("width:5px;height:5px;border-radius:2px;background:", s?.dot))} />
                      <span style={{"fontSize":"11.5px","color":"var(--ink)"}}>
                        {txt(s?.who)}
                      </span>
                      <span style={{"fontFamily":"var(--mono)","fontSize":"9.5px","color":"var(--faint)"}}>
                        {txt(s?.state)}
                      </span>
                    </div>
                  </Fragment>
                ))}
                <div style={{"flex":"1","minWidth":"6px"}} />
                <button className="ixy" onClick={a?.openWork} style={{"display":"inline-flex","alignItems":"center","gap":"7px","height":"30px","padding":"0 13px","border":"1px solid var(--accent-line)","borderRadius":"var(--r-ctl,11px)","background":"var(--accent-faint)","fontSize":"12.5px","color":"var(--ink)","cursor":"pointer","transition":"background .2s var(--ease),transform .18s var(--ease)"}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.6 12S6.4 5.5 12 5.5 21.4 12 21.4 12 17.6 18.5 12 18.5 2.6 12 2.6 12Z" />
                    <circle cx="12" cy="12" r="2.6" />
                  </svg>
                  {txt(a?.viewLabel)}
                </button>
                {a?.pending && (
                  <>
                    <button className={cx("ixp")} onClick={a?.approve} style={{"height":"30px","padding":"0 14px","border":"0","borderRadius":"var(--cta-r,9px)","background":"var(--accent-fill,var(--accent))","color":"var(--on-accent)","boxShadow":"var(--accent-glow,none)","fontSize":"12.5px","fontWeight":"500","cursor":"pointer","transition":"background .2s var(--ease),transform .18s var(--ease)"}}>
                      {"Approve"}
                    </button>
                    <button className="ixz" onClick={a?.approve} style={{"height":"30px","padding":"0 13px","border":"1px solid var(--border)","background":"none","borderRadius":"var(--r-ctl,9px)","fontSize":"12.5px","color":"var(--ink)","cursor":"pointer","transition":"border-color .2s var(--ease)"}}>
                      {"Decline"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </Fragment>
        ))}
        {v.workApprovalsEmpty && (
          <div style={{"background":"var(--surface)","border":"1px solid var(--border)","borderRadius":"var(--card-r,18px)","backdropFilter":"blur(20px) saturate(1.3)","boxShadow":"var(--card-shadow)","padding":"40px 22px","textAlign":"center"}}>
            <div style={{"fontSize":"14px"}}>
              {txt(ap?.emptyTitle)}
            </div>
            <div style={{"fontSize":"12.5px","color":"var(--dim)","marginTop":"5px"}}>
              {txt(ap?.emptyBody)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
