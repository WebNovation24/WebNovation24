(()=>{
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const reveal=[...document.querySelectorAll('.reveal,[data-reveal]')];
  const header=document.querySelector('[data-header]');
  const trace=document.querySelector('.signal-trace');

  const showAll=()=>reveal.forEach(el=>el.classList.add('is-visible'));
  if(reduce.matches||!('IntersectionObserver' in window)){
    showAll();
    if(trace) trace.classList.add('is-active');
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
      const tio=new IntersectionObserver(entries=>{
        if(entries.some(e=>e.isIntersecting)){
          trace.classList.add('is-active');
          tio.disconnect();
        }
      },{threshold:.25});
      tio.observe(trace.parentElement);
    }
  }

  const updateHeader=()=>header?.classList.toggle('is-scrolled',scrollY>16);
  updateHeader();
  addEventListener('scroll',updateHeader,{passive:true});
})();