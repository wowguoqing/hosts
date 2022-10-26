const fetch = require('node-fetch');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

const githubUrls = [
  'github.githubassets.com',
  'central.github.com',
  'desktop.githubusercontent.com',
  'assets-cdn.github.com',
  'camo.githubusercontent.com',
  'github.map.fastly.net',
  'github.global.ssl.fastly.net',
  'gist.github.com',
  'github.io',
  'github.com',
  'api.github.com',
  'raw.githubusercontent.com',
  'user-images.githubusercontent.com',
  'favicons.githubusercontent.com',
  'avatars5.githubusercontent.com',
  'avatars4.githubusercontent.com',
  'avatars3.githubusercontent.com',
  'avatars2.githubusercontent.com',
  'avatars1.githubusercontent.com',
  'avatars0.githubusercontent.com',
  'avatars.githubusercontent.com',
  'codeload.github.com',
  'github-cloud.s3.amazonaws.com',
  'github-com.s3.amazonaws.com',
  'github-production-release-asset-2e65be.s3.amazonaws.com',
  'github-production-user-asset-6210df.s3.amazonaws.com',
  'github-production-repository-file-5c1aeb.s3.amazonaws.com',
  'githubstatus.com',
  'github.community',
  'media.githubusercontent.com',
  'raw.github.com',
  'translate.googleapis.com'
];

const headers = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
};

const mdPath = {
  tpl: path.join('./', 'template.md'),
  dest: path.join('./', 'README.md'),
  hosts: path.join('./', 'hosts'),
};

const ipAddressFooter = '.ipaddress.com';

const tpl = `
{content}
# Please Star : https://github.com/wowguoqing/hosts
# Mirror Repo : https://gitee.com/wowguoqing/hosts
`;

function lJust(str, total, pad) {
  return str + Array(total - str.length)
    .join(pad || ' ');
}

function resolveUrl(url) {
  const urlBody = url.split('.');

  if (urlBody.length > 2) {
    return 'https://' + urlBody[urlBody.length - 2] + '.' + urlBody[urlBody.length - 1] + ipAddressFooter + '/' + url;
  }

  return 'https://' + url + ipAddressFooter;
}

async function findIp(host) {
  const url = resolveUrl(host);

  const response = await fetch(url, {
    headers: headers
  });
  const htmlText = await response.text();

  const $ = cheerio.load(htmlText);

  const ipList = [];

  $('#dnsinfo>tr')
    .each(function (i, element) {
      let td = $(this).children();
      if ($(td[1]).text() === 'A') {
        ipList.push($(this)
        .children()
        .last()
        .text());
      }
    });

  return ipList;
}

async function findIpWrapper(host) {
  let retryCount = 3;

  let result = '';

  try {
    result = await findIp(host);
  } catch (err) {
    if (retryCount > 1) {
      retryCount--;
      result = await findIp(host);
    } else {
      console.log(`${host} is failed.`);
    }
  }

  return result;
}

function writeHosts(content) {
  fs.writeFileSync(mdPath.hosts, content);
}

function updateMd(content) {
  let prevMd = '';

  try {
    prevMd = fs.readFileSync(mdPath.dest, 'utf-8');
  } catch (err) {

  }

  const regMatch = prevMd.match(/GitHub Host Start([\s\S]*)# Update at/);
  const prevHost = regMatch ? regMatch[1].trim() : '';

  const needUpdate = prevHost !== content;

  if (needUpdate) {
    const updateTime = dayjs()
      .tz('Asia/Shanghai')
      .format('YYYY-MM-DD HH:mm:ss');

    const template = fs.readFileSync(mdPath.tpl, 'utf-8');

    const nextHostContent = '# GitHub Host Start\n\n' + content + '\n# Update at: ' + updateTime + '\n\n# GitHub Host End';

    const replacedMdContent = template.replace('{hostContent}', nextHostContent)
      .replace('{update_time}', updateTime);

    fs.writeFileSync(mdPath.dest, replacedMdContent);

    writeHosts(nextHostContent);
  }
}

async function updateHosts() {
  let generatedContent = '';

  for (let i = 0; i < githubUrls.length; i++) {
    console.log(`${i + 1}/${githubUrls.length}:${githubUrls[i]}`);
    const result = await findIpWrapper(githubUrls[i]);
    if (result && result.length) {
      generatedContent += lJust(result[0], 30) + githubUrls[i] + '\n';
    }
  }

  try {
    updateMd(tpl.replace('{content}', generatedContent)
      .trim());
  } catch (err) {
    console.error(err.message);
  }
}

(async function () {
  await updateHosts();
})();
