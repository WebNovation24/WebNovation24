(()=>{
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const reveal=[...document.querySelectorAll('.reveal,[data-reveal]')];
  const header=document.querySelector('[data-header]');
  const trace=document.querySelector('.signal-trace,.signal-path-v7,.systems-line-v8');
  const heroVideo=document.querySelector('[data-hero-video]');
  const mobileDetails=[...document.querySelectorAll('[data-mobile-collapse]')];

  const showAll=()=>reveal.forEach(el=>el.classList.add('is-visible'));
  const syncResponsiveDetails=()=>{
    const compact=matchMedia('(max-width: 700px)').matches;
    if(compact) mobileDetails.forEach(el=>{ el.open=false; });
  };
  syncResponsiveDetails();
  addEventListener('resize',syncResponsiveDetails,{passive:true});
  const track=(name,data={})=>window.va?.('event',{name,data});
  document.addEventListener('click',event=>{
    const link=event.target.closest?.('[data-track]');
    if(!link) return;
    track(link.dataset.track,{path:location.pathname});
  });
  const scrollMarks=new Set();
  const reportScroll=()=>{
    if(!window.va) return;
    const max=document.documentElement.scrollHeight-innerHeight;
    if(max<=0) return;
    const ratio=Math.round((scrollY/max)*100);
    [25,50,75,100].forEach(mark=>{
      if(ratio>=mark&&!scrollMarks.has(mark)){
        scrollMarks.add(mark);
        track('scroll_depth',{percent:mark,path:location.pathname});
      }
    });
  };
  addEventListener('scroll',reportScroll,{passive:true});

  document.documentElement.classList.toggle('reduced-motion',reduce.matches);

  if(reduce.matches||!('IntersectionObserver' in window)){
    showAll();
    trace?.classList.add('is-active');
  }else{
    const io=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      }
    },{threshold:.08,rootMargin:'0px 0px -6% 0px'});
    reveal.forEach(el=>io.observe(el));

    if(trace){
      const traceObserver=new IntersectionObserver(entries=>{
        if(entries.some(entry=>entry.isIntersecting)){
          trace.classList.add('is-active');
          traceObserver.disconnect();
        }
      },{threshold:.25});
      traceObserver.observe(trace.parentElement);
    }
  }

  const updateHeader=()=>header?.classList.toggle('is-scrolled',scrollY>16);
  updateHeader();
  addEventListener('scroll',updateHeader,{passive:true});

  const syncHeroVideo=()=>{
    if(!heroVideo) return;
    if(reduce.matches||document.hidden){
      heroVideo.pause();
      return;
    }
    heroVideo.play().catch(()=>{});
  };

  if(heroVideo){
    syncHeroVideo();

    if('IntersectionObserver' in window&&!reduce.matches){
      const videoObserver=new IntersectionObserver(entries=>{
        const visible=entries.some(entry=>entry.isIntersecting);
        if(visible&&!document.hidden) heroVideo.play().catch(()=>{});
        else heroVideo.pause();
      },{threshold:.05});
      videoObserver.observe(heroVideo);
    }

    document.addEventListener('visibilitychange',syncHeroVideo);
    reduce.addEventListener?.('change',()=>{ document.documentElement.classList.toggle('reduced-motion',reduce.matches); syncHeroVideo(); });
  }
})();