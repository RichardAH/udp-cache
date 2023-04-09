/**
 * UDP cache slave server
 *
 * Topology:
 *
 * Client (edge node) <=[loopback tcp]=> Local slave (this code) <=[async udp]=> Remote master (cache-master.js)
 */
const config = 
{
    cache_time: 4000, // ms

    from_client_port: 12005,         // slave's listening port for local clients to communicate with

    from_master_port: 12004,         // slave's listening port for master to communicate with

    master_ip: "127.0.0.1",
    to_master_port: 12003,                  // master's port for receiving data from slaves
    debug: true
};


const net = require('net');
const dgram = require('dgram');
const udp_to_master = dgram.createSocket({ type: 'udp4', reuseAddr: true });
const udp_from_master = dgram.createSocket({ type: 'udp4', reuseAddr: true });

// timeslice -> key -> value
let cache = {};

udp_from_master.on('message', (msg, rinfo) =>
{
    if (config.debug)
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

udp_from_master.on('listening', () =>
{
  const address = udp_from_master.address();
  console.log(`sock (from master) listening ${address.address}:${address.port}, pid=${process.pid}`);
});

udp_from_master.bind(config.from_master_port);

const cache_func = (key, value) => { 

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

        // report the hit to master
        udp_to_master.send(out, 0, out.length, config.to_master_port, config.master_ip);

        return true;
};


net.createServer(tcp_client =>
{
    //Log when a client connnects.
    console.log(`tcp client connection: ${tcp_client.remoteAddress}:${tcp_client.remotePort} Connected`);

    //Handle the client data.
    tcp_client.on('data', line => 
    {
        line = (''+line).split('<><><>');
        const cache_resp = cache_func(line[0], line[1]);

        if (debug)
            console.log("udp_cache('" + line[0] + "', '" + line[1] + "') = " + cache_resp);

        tcp_client.write(cache_resp + '');

    });
    
    //Handle when client connection is closed
    tcp_client.on('close',function(){
        console.log(`${tcp_client.remoteAddress}:${tcp_client.remotePort} Connection closed`);
    });
    
    //Handle Client connection error.
    tcp_client.on('error',function(error){
        console.error(`${tcp_client.remoteAddress}:${tcp_client.remotePort} Connection Error ${error}`);
    });
}).listen(config.from_client_port);


/*

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
*/
