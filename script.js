/* Hummie Bear: Supabase bridge + existing interaction script loader. */
(() => {
  const SUPABASE_URL = 'https://xsabwmcjgjijmwxwyx.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_LoVCt7ZXZ4ytzpgKRcfwgg_O96TheUc';
  const LEGACY_SCRIPT = 'https://raw.githubusercontent.com/yoranberth1-arch/humiebear/f8be20990c13c1303563f84c18bfe14d8806aaff/script.js';
  const originalFetch = window.fetch.bind(window);
  const get = (fd, name) => fd.get(name)?.toString().trim() || null;
  const all = (fd, name) => fd.getAll(name).map(String);

  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (!url.includes('formspree.io/f/xnpqeljn') || !(init.body instanceof FormData)) {
      return originalFetch(input, init);
    }

    const fd = init.body;
    const label = get(fd, 'editions');
    const edition = ({
      'Hummie Bear Waffle Edition': 'waffle',
      'Hummie Bear Candy Edition': 'candy',
      'Beide editions': 'both',
      'Snoepzakken op maat': 'bags'
    })[label];
    const guests = Number(get(fd, 'guests') || 0);
    const start = guests < 50 ? 150 : 0;
    const waffleOptions = all(fd, 'waffle_options');
    const candyOptions = all(fd, 'candy_options');
    let estimatedPrice = null;
    if (edition === 'waffle') estimatedPrice = guests * 20 + start + (waffleOptions.includes('Snoepzakje + €5 p.p.') ? guests * 5 : 0);
    if (edition === 'candy') estimatedPrice = guests * 10 + start;
    if (edition === 'both') estimatedPrice = guests * 29.5 + start;

    let startTime = null;
    let endTime = null;
    const hours = get(fd, 'hours');
    const timeMatch = hours?.match(/(\d{1,2}:\d{2}).*?(\d{1,2}:\d{2})/);
    if (timeMatch) {
      startTime = `${timeMatch[1].padStart(5, '0')}:00`;
      endTime = `${timeMatch[2].padStart(5, '0')}:00`;
    }

    const quote = {
      name: get(fd, 'name'),
      organisation: get(fd, 'name'),
      email: get(fd, 'email'),
      phone: get(fd, 'phone'),
      event_name: get(fd, 'event_name'),
      event_date: get(fd, 'date'),
      start_time: startTime,
      end_time: endTime,
      location: get(fd, 'location'),
      guests,
      hours,
      event_type: get(fd, 'event_type'),
      edition,
      options: {
        waffle_options: waffleOptions,
        candy_options: candyOptions,
        bag_quantity: get(fd, 'bag_quantity'),
        bag_composition: get(fd, 'bag_composition'),
        bag_sweets: get(fd, 'bag_sweets'),
        bag_personalization: get(fd, 'bag_personalization')
      },
      practical_notes: get(fd, 'practical_notes'),
      message: get(fd, 'message'),
      estimated_price: estimatedPrice,
      status: 'new'
    };

    try {
      const response = await originalFetch(`${SUPABASE_URL}/rest/v1/quotes`, {
        method: 'POST',
        headers: {
          // Publishable keys are API keys, not JWTs: send them via apikey only.
          apikey: SUPABASE_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify(quote),
        cache: 'no-store'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Hummie Bear Supabase error:', response.status, errorText);
        return response;
      }

      console.log('Hummie Bear: quote opgeslagen in Supabase.');
      return new Response('{}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Hummie Bear Supabase connection error:', error);
      throw error;
    }
  };

  const script = document.createElement('script');
  script.src = LEGACY_SCRIPT;
  script.async = false;
  document.head.appendChild(script);
})();
