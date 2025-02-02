const express = require('express');
const si = require('systeminformation');
const { exec } = require('child_process');
const os = require('os');
const sc = require('windows-service-controller'); // Windows service controller module

const app = express();
const port = 3000;

// Set global timeout and poll interval for windows-service-controller
sc.timeout(120);      // Global timeout (in seconds)
sc.pollInterval(5);   // Poll interval (in seconds)

// Use JSON middleware to parse JSON request bodies
app.use(express.json());

// Serve static files from the "public" folder (where your HTML files reside)
app.use(express.static('public'));

// -------------------- Endpoints for Process and System Stats -------------------- //

// Endpoint to fetch running processes
app.get('/processes', async (req, res) => {
    try {
        const processes = await si.processes();
        if (!processes.list) {
            throw new Error('No process list available');
        }
        const processList = processes.list.map(proc => ({
            pid: proc.pid,
            name: proc.name,
            cpu: (typeof proc.cpu === 'number') ? proc.cpu.toFixed(2) : 'N/A',
            memory: (typeof proc.memory === 'number') ? (proc.memory / (1024 * 1024)).toFixed(2) : 'N/A'
        }));
        res.json({ list: processList });
    } catch (error) {
        console.error("Error fetching processes:", error);
        res.status(500).json({ error: 'Failed to fetch processes' });
    }
});

// Endpoint to fetch running services using windows-service-controller
app.get('/services', async (req, res) => {
    try {
        const services = await sc.query();  // sc.query() returns a promise with parsed service data
        res.json({ list: services });
    } catch (error) {
        console.error("Error fetching services via windows-service-controller:", error);
        res.status(500).json({ error: 'Failed to fetch services' });
    }
});

// Endpoint to fetch system statistics for graphical data (CPU, Memory, Battery, Graphics, etc.)
//const si = require('systeminformation');

app.get('/system-stats', async (req, res) => {
    try {
        const cpu = await si.currentLoad();
        const memory = await si.mem();
        const battery = await si.battery();
        const graphics = await si.graphics();
        const systemInfo = await si.system();

        const systemStats = {
            cpu: {
                currentLoad: (typeof cpu.currentLoad === 'number') ? cpu.currentLoad.toFixed(2) : 'N/A',
                cores: cpu.cores,
                speed: (cpu.avgLoad) ? cpu.avgLoad.toFixed(2) : 'N/A'
            },
            memory: {
                active: (typeof memory.active === 'number') ? (memory.active / (1024 * 1024 * 1024)).toFixed(2) : 'N/A', // in GB
                total: (typeof memory.total === 'number') ? (memory.total / (1024 * 1024 * 1024)).toFixed(2) : 'N/A' // in GB
            },
            battery: {
                hasBattery: battery.hasbattery ? 'Yes' : 'No',  // Improved representation (Yes/No)
                percent: battery.percent,
                isCharging: battery.ischarging ? 'Yes' : 'No', // Yes/No format
                timeRemaining: battery.timeRemaining || 'N/A'
            },
            graphics: graphics.controllers.map(controller => ({
                model: controller.model || 'Unknown',
                vram: controller.vram ? (controller.vram / 1024).toFixed(2) : 'N/A', // Convert to MB
                temperature: controller.temperature || 'N/A'
            })),
            system: {
                manufacturer: systemInfo.manufacturer || 'Unknown',
                model: systemInfo.model || 'Unknown',
                version: systemInfo.version || 'Unknown'
            }
        };

        res.json(systemStats);
    } catch (error) {
        console.error("Error fetching system stats:", error);
        res.status(500).json({ error: 'Failed to fetch system stats' });
    }
});


// Endpoint to kill a process by PID
app.delete('/kill/:pid', (req, res) => {
    const pid = req.params.pid;
    const command = os.platform() === 'win32' 
        ? `taskkill /PID ${pid} /F` 
        : `kill -9 ${pid}`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error killing process ${pid}:`, stderr);
            return res.status(500).json({ error: `Failed to kill process ${pid}` });
        }
        console.log(`Successfully killed process ${pid}`);
        res.status(200).json({ message: `Successfully killed process ${pid}` });
    });
});

// -------------------- Endpoints for Service Control -------------------- //

// Endpoint to start a service or list of services
app.post('/service/start', async (req, res) => {
    try {
        const { server, service, timeout, args, serial } = req.body;
        const result = await sc.start(server || undefined, service, {
            timeout: timeout || 30,
            args: args || [],
            serial: serial || false
        });
        res.json({ message: `Service(s) started successfully.`, result });
    } catch (error) {
        console.error("Error starting service:", error);
        res.status(500).json({ error: 'Failed to start service' });
    }
});

// Endpoint to pause a service or list of services
app.post('/service/pause', async (req, res) => {
    try {
        const { server, service, timeout, serial } = req.body;
        const result = await sc.pause(server || undefined, service, {
            timeout: timeout || 30,
            serial: serial || false
        });
        res.json({ message: `Service(s) paused successfully.`, result });
    } catch (error) {
        console.error("Error pausing service:", error);
        res.status(500).json({ error: 'Failed to pause service' });
    }
});

// Endpoint to continue (resume) a paused service or list of services
app.post('/service/continue', async (req, res) => {
    try {
        const { server, service, timeout, serial } = req.body;
        const result = await sc.continue(server || undefined, service, {
            timeout: timeout || 30,
            serial: serial || false
        });
        res.json({ message: `Service(s) continued successfully.`, result });
    } catch (error) {
        console.error("Error continuing service:", error);
        res.status(500).json({ error: 'Failed to continue service' });
    }
});
// Endpoint to get the list of services
app.get('/services', async (req, res) => {
    try {
        // Replace with the actual logic to fetch running services on the server
        const services = await getServices(); // This is a placeholder function
        res.json({ list: services });
    } catch (error) {
        console.error("Error fetching services:", error);
        res.status(500).json({ error: 'Failed to fetch services' });
    }
});

// Helper function to simulate fetching running services
async function getServices() {
    // Replace this with the logic to get the services list from the system
    return [
        { name: 'Service 1', status: 'Running', pid: 1234, user: 'user1' },
        { name: 'Service 2', status: 'Paused', pid: 5678, user: 'user2' },
    ];
}

// Endpoint to start, pause, continue, or stop services
app.post('/services/:serviceName/:action', async (req, res) => {
    try {
        const { serviceName, action } = req.params;
        const { timeout, serial } = req.body;

        let result;
        switch (action) {
            case 'start':
                result = await sc.start(undefined, serviceName, {
                    timeout: timeout || 30,
                    serial: serial || false
                });
                break;
            case 'pause':
                result = await sc.pause(undefined, serviceName, {
                    timeout: timeout || 30,
                    serial: serial || false
                });
                break;
            case 'continue':
                result = await sc.continue(undefined, serviceName, {
                    timeout: timeout || 30,
                    serial: serial || false
                });
                break;
            case 'stop':
                result = await sc.stop(undefined, serviceName, {
                    timeout: timeout || 30,
                    waitForExit: false,
                    serial: serial || false
                });
                break;
            default:
                return res.status(400).json({ error: 'Invalid action' });
        }
        res.json({ message: `Service ${action} was successful.`, result });
    } catch (error) {
        console.error("Error performing action:", error);
        res.status(500).json({ error: 'Failed to perform action' });
    }
});

// Endpoint to stop a service or list of services
app.post('/service/stop', async (req, res) => {
    try {
        const { server, service, timeout, waitForExit, serial } = req.body;
        const result = await sc.stop(server || undefined, service, {
            timeout: timeout || 30,
            waitForExit: waitForExit || false,
            serial: serial || false
        });
        res.json({ message: `Service(s) stopped successfully.`, result });
    } catch (error) {
        console.error("Error stopping service:", error);
        res.status(500).json({ error: 'Failed to stop service' });
    }
});

// -------------------- Start the Server -------------------- //

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
