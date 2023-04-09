/**
 * UDP cache example client
 *
 * Topology:
 *
 * Client (this code) <=[loopback tcp]u=> Local slave (cache-slave.js) <=[async udp]=> Remote master (cache-master.js)
 */

const cache_client = (()=>
{
    const config = 
    {
        cache_time: 4000 // ms
        slave_ip: "127.0.0.1",
        slave_port: 12005,  
        debug: true
    };


    const net = require('net');

    let sock;


    return (key, value) =>
    {
        return new Promise(resolve, reject) =>
        {
            if (sock === undefined  || sock.readyState != "open")
                return resolve(false);

            let to_send = key;
            if (value !== undefined)
            {
                to_send += "<><><>" + value;
                sock.write(to_send);
                return resolve(true);
            }

            sock.write(to_send);

            setTimeout(()=>
            {
               // rhupto : wait for response from slave, resolve promise 

            }, 1);



        }
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
