const path = require('path')
const yaml = require('yaml')
const fs = require('fs-extra')

// Define folder paths.
const PUBLIC_FOLDER = path.join(__dirname, '..', 'public')
const DIST_FOLDER = path.join(__dirname, '..', 'dist')
const V4_FOLDER = path.join(DIST_FOLDER, 'v4')
const SOURCE_FOLDER = path.join(PUBLIC_FOLDER, 'v4')
const APPS_FOLDER = path.join(SOURCE_FOLDER, 'apps')
const LOGOS_FOLDER = path.join(SOURCE_FOLDER, 'logos')

/**
 * Read and parse a YAML file.
 * @param {string} filePath - The path to the YAML file.
 * @returns {Promise<Object>} Parsed content of the YAML file.
 */
async function readYamlFile(filePath) {
    const contentString = await fs.readFile(filePath, 'utf-8')
    return yaml.parse(contentString)
}

/**
 * Capitalize the first letter of a string.
 * @param {string} string - The string to capitalize.
 * @returns {string} Capitalized string.
 */
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
}

/**
 * Create an app list from the filenames of apps.
 * @param {Array<string>} appFilenames - An array of application filenames.
 * @returns {Promise<Object>} Object containing the proper app files list and details.
 */
async function makeAppList(appFilenames) {
    const properAppFiles = appFilenames.filter((file) => file.endsWith('.yml'))

    if (properAppFiles.length !== appFilenames.length) {
        throw new Error('Hey! Everything in v4 needs that .yml extension.')
    }

    const appDetails = []

    for (const filename of properAppFiles) {
        const content = await readYamlFile(path.join(APPS_FOLDER, filename))
        const captainVersion = `${content.captainVersion}`

        const appName = filename.replace('.yml', '')
        const appData = content.caproverOneClickApp || {}

        if (captainVersion === '4') {
            const displayName =
                appData.displayName || capitalizeFirstLetter(appName)
            const description = appData.description || ''

            appDetails.push({
                name: appName,
                displayName: displayName,
                description: description,
                isOfficial: appData.isOfficial === 'true',
                logoUrl: `${appName}.png`,
            })
        } else {
            throw new Error(
                `Whoa, an unknown captain version: ${captainVersion}`
            )
        }
    }

    return {
        appList: properAppFiles,
        appDetails,
    }
}

/**
 * Build distribution folder.
 */
async function buildDist() {
    try {
        const appFilenames = await fs.readdir(APPS_FOLDER)

        for (const filename of appFilenames) {
            const filePath = path.join(APPS_FOLDER, filename)
            const content = await readYamlFile(filePath)

            await fs.outputJson(
                path.join(V4_FOLDER, 'apps', filename.replace('.yml', '')),
                content
            )
        }

        await fs.copy(LOGOS_FOLDER, path.join(V4_FOLDER, 'logos'))

        const allAppsList = await makeAppList(appFilenames)
        const list = {
            oneClickApps: allAppsList.appDetails,
        }

        await fs.outputJson(path.join(V4_FOLDER, 'list'), list)
        await fs.copy(
            path.join(PUBLIC_FOLDER, 'CNAME'),
            path.join(DIST_FOLDER, 'CNAME')
        )
        await fs.copy(
            path.join(PUBLIC_FOLDER, 'logo-transparent.png'),
            path.join(DIST_FOLDER, 'logo-transparent.png')
        )
        await createIndexHtml(allAppsList.appDetails)
    } catch (err) {
        console.error(err)
        process.exit(127)
    }
}

async function createIndexHtml(appList) {
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Available Apps - VMG Ware CapRover</title>
        <link rel="icon" href="logo-transparent.png" type="image/png">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="min-h-screen bg-gray-100 font-sans">
        <div class="container mx-auto px-4 py-8">
        <div class="text-center mb-12">
          <img src="logo-transparent.png" alt="Logo" class="mx-auto hover:scale-110 transform transition duration-500 w-auto h-12">
        </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            ${appList
                .map(
                    (app) => `
              <div class="bg-gray-200 rounded-md overflow-hidden shadow transform transition duration-300 hover:scale-105 hover:shadow-lg border border-gray-300">
                <div class="p-4">
                  <img class="w-16 h-16 mx-auto" src="v4/logos/${app.logoUrl}" alt="${app.displayName} logo">
                  <div class="py-4">
                    <h2 class="text-2xl font-semibold text-center">${app.displayName}</h2>
                    <p class="text-gray-700 text-sm text-center mt-2">${app.description}</p>
                  </div>
                </div>
              </div>
            `
                )
                .join('')}
          </div>
        </div>

        <footer class="text-center mt-8 pb-4 border-t border-gray-300">
            <p class="text-gray-500 text-sm">UI by <a href="https://github.com/caproverhub/caprover-one-click-apps" class="text-blue-500">Awes0meHub</a></p>
            <p class="text-gray-500 text-sm">Powered by <a href="https://caprover.com" class="text-blue-500">CapRover</a></p>
        </footer>
      </body>
    </html>
  `

    await fs.writeFile(path.join(DIST_FOLDER, 'index.html'), htmlContent)
}

/**
 * Main function to build distribution data.
 */
async function main() {
    try {
        await buildDist()
    } catch (err) {
        console.error(err)
        process.exit(127)
    }
}

main()
