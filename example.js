const udp_cache = (()=>
{
    const config = 
    {
        cache_time: 4000, // ms
        port: 12003,
        return_port: 12004,
        ip: "127.0.0.1"
    };


    const dgram = require('dgram');
    const socket_out = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    // timeslice -> key -> value
    let cache = {};

    socket.on('message', (msg, rinfo) =>
    {
        console.log(`socket pid=${process.pid} got: ${msg} from ${rinfo.address}:${rinfo.port}`);
        
        const timeslice = Math.floor((+ new Date())/config.cache_time);

        msg = (''+msg).split('<><><>');

        if (msg.length != 2)
            return;

        if (cache[timeslice] === undefined)
            cache[timeslice] = {};

        cache[timeslice][msg[0]] = msg[1];
        
        let to_clean = Object.keys(cache).sort();
        for (let x in to_clean)
        {
            const timeslice_expired = to_clean[x];
            if (timeslice_expired >= timeslice)
                break;

            delete cache[timeslice_expired];
        }
    });

    socket.on('listening', () =>
    {
      const address = socket.address();
      console.log(`socket listening ${address.address}:${address.port}, pid=${process.pid}`);
    });

    socket.bind(config.return_port);

    return (key, value) => { 

            const timeslice = Math.floor((+ new Date())/config.cache_time);

            if (value === undefined)
            {
                if (cache[timeslice] === undefined)
                    return false;
                const hit = cache[timeslice][key];
                return hit === undefined ? false : hit;
            }

            // execution to here means we're reporting a value to cache

            const out = key + '<><><>' + value;

            // report the hit
            socket_out.send(out, 0, out.length, config.port, config.ip);

            return true;
    };
})();


console.log("Type a key to get its cached value, or type key<><><>value to cache a value");

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
    line = line.split('<><><>');

    console.log("udp_cache('" + line[0] + "', '" + line[1] + "') = " + udp_cache(line[0], line[1]));
});

rl.once('close', () => {
     // end of input
});
