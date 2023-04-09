const port = 12003
const return_port = 12004
const cache_time = 4000 // ms
const dgram = require('dgram')
const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

// mapping: timeslice => cache key => cache value
let table = {};

let clients = {};

socket.on('message', (msg, rinfo) =>
{
    console.log(`socket got: ${msg} from ${rinfo.address}:${rinfo.port}`);

    if (clients[rinfo.address] === undefined)
        clients[rinfo.address] = true;
    
    const timeslice_curr = Math.floor((+new Date())/cache_time);

    // first side is the key, second side is the value (if any) 
    msg = (msg + '').split('<><><>');

    if (table[timeslice_curr] === undefined)
        table[timeslice_curr] = {};

    if (msg.length == 2)
    {
        // setting value
        console.log("setting value: " + msg[0] + ' => ' + msg[1]);
        table[timeslice_curr][msg[0]] = msg[1];
        const outmsg = msg[0] + '<><><>' + msg[1];

        for (let client in clients)
            socket.send(outmsg, 0, outmsg.length, return_port, client);
    }
    else
    {

        // getting value
        const hit = table[timeslice_curr][msg[0]];
        if (hit !== undefined)
        {
            // cache hit, send out
            outmsg = msg + '<><><>' + hit;
            socket.send(outmsg, 0, outmsg.length, return_port, rinfo.address);
        }

    }

    // garbage collection
    let to_clean = Object.keys(table).sort();
    for (let x in to_clean)
    {
        const timeslice_expired = to_clean[x];
        if (timeslice_expired >= timeslice_curr)
            break;

        delete table[timeslice_expired];
    }

});


socket.on('listening', () =>
{
  const address = socket.address();
  console.log(`socket listening ${address.address}:${address.port}`);
});

socket.bind(port);
