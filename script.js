// ==UserScript==
// @name         compr.ar extended
// @namespace    http://github.com/mariann03
// @version      0.1
// @description  adds new features to comprar.gob.ar web page
// @author       mariann03
// @match        https://comprar.gob.ar/Compras.aspx?*
// @grant        none
// ==/UserScript==

localStorage.__proto__.getParsedItem = key => {
  return JSON.parse(localStorage.getItem(key))
}
localStorage.__proto__.stringifyAndSetItem = (key, value) => {
  return localStorage.setItem(key, JSON.stringify(value))
}

const skeletonContent = `
  <div class="skeleton-item"></div>
  <div class="skeleton-item an-2"></div>
  <div class="skeleton-item an-3"></div>
  <div class="skeleton-item"></div>
  <div class="skeleton-item an-2"></div>
  <div class="skeleton-item an-3"></div>
`

const HIDE_VISITED = 'HIDE_VISITED'
const TABLE_ID = 'ctl00_CPH1_GridListaPliegosAperturaProxima'
const isHidden = localStorage.getParsedItem(HIDE_VISITED)

let hasInfinitScroll = false
const rowsByKey = {}

function injectFormat(table) {
  const [header] = table.getElementsByClassName('tr-header')
  const rows = [...table.querySelectorAll('tr:not(.tr-header):not(.pagination-gv):not(:last-of-type)')]

  const th = document.createElement('th')
  th.scope = 'col'
  th.innerText = 'Estado'
  header.appendChild(th)

  table.classList.remove('table-striped', 'table-hover')

  for (const row of rows) {
    const [link] = row.getElementsByTagName('a')
    const key = link.text
    const value = localStorage.getParsedItem(key)

    const td = document.createElement('td')
    const label = document.createElement('label')
    const text = document.createElement('p')
    const checkbox = document.createElement('input')

    checkbox.type = 'checkbox'
    checkbox.checked = value
    text.innerText = value ? 'leído' : 'no leído'
    text.classList.add('nowrap')

    if (!value) {
      row.classList.add('new-row')
    }

    label.appendChild(text)
    label.appendChild(checkbox)
    td.appendChild(label)
    row.appendChild(td)

    link.onclick = async (e) => {
      e.preventDefault()

      const parsedId = link.id.replace(/_/g, '$')
      theForm.__EVENTTARGET.value = parsedId
      const body = new FormData(theForm)
      body.append('ctl00$ScriptManager1', `ctl00$CPH1$ctl03|${parsedId}`)

      const response = await fetch('./Compras.aspx?qs=W1HXHGHtH10%3d', {
        method: 'post',
        body,
        headers: {
          'X-MicrosoftAjax': 'Delta=true',
        },
      })
      const text = await response.text()
      window.open(unescape(text.split('|')[7]), '_blank')
    }
    link.onauxclick = link.onclick

    const isVisited = () => {
      localStorage.getParsedItem()
      return localStorage.getParsedItem(key)
    }

    const toggleVisibility = (hidden = localStorage.getParsedItem(HIDE_VISITED)) => {
      if (hidden) {
        row.classList.add('hidden')
        return
      }
      row.classList.remove('hidden')
    }
    if (value) {
      toggleVisibility()
    }

    link.addEventListener('click', () => {
      localStorage.stringifyAndSetItem(key, true)

      text.innerText = 'leído'
      checkbox.checked = true
      row.classList.remove('new-row')
      toggleVisibility()
    })

    checkbox.addEventListener('click', () => {
      const newValue = !localStorage.getParsedItem(key)

      localStorage.stringifyAndSetItem(key, newValue)

      if (!newValue) row.classList.add('new-row')
      else row.classList.remove('new-row')

      text.innerText = newValue ? 'leído' : 'no leído'
      checkbox.checked = newValue
      toggleVisibility()
    })

    rowsByKey[key] = { row, isVisited, toggleVisibility }
  }

}

function injectInfinitScroll(rootForm) {
  if(hasInfinitScroll) return
  hasInfinitScroll = true

  let isFetching = false
  const TOTAL_ELEMENT_ID = 'ctl00_CPH1_lblCantidadListaPliegosAperturaProxima'
  const LAST_ELEMENT_ID = 'ctl00_CPH1_btnDescargarReporteExcelAperturaProxima'

  const totalElement = document.getElementById(TOTAL_ELEMENT_ID)
  const lastElement = document.getElementById(LAST_ELEMENT_ID)

  const [total] = totalElement.innerText.match(/\d+/g)
  const pages = Math.ceil(total / 10)
  const storage = document.createElement('div')
  document.body.appendChild(storage)
  storage.style.display = 'none'
  document.getElementsByClassName('pagination-gv')[0].style.display = 'none'
  let pageIndex = 2

  const skeleton = document.createElement('div')
  skeleton.classList.add('skeleton-container', 'hidden')
  skeleton.innerHTML = skeletonContent
  rootForm.parentNode.parentNode.appendChild(skeleton)

  function getBody(content) {
    let x = content.indexOf('<body')
    x = content.indexOf('>', x)
    const y = content.lastIndexOf('</body>')
    return content.slice(x + 1, y)
  }

  let stillVisible
  async function getPage() {
    isFetching = true
    skeleton.classList.remove('hidden')
    theForm.__EVENTTARGET.value = 'ctl00$CPH1$GridListaPliegosAperturaProxima'
    theForm.__EVENTARGUMENT.value = 'Page$' + pageIndex
    try {
      const newPage = await fetch('./Compras.aspx?qs=W1HXHGHtH10%3d', {
        method: 'post',
        body: new FormData(theForm),
      })

      storage.innerHTML = getBody(await newPage.text())
      const currentPageForm = storage.querySelector(`#${TABLE_ID} > tbody`)
      const rows = [...currentPageForm.querySelectorAll('tr:not(.tr-header):not(.pagination-gv):not(:last-of-type)')]
      const pageForm = storage.querySelector('#aspnetForm')
      injectFormat(currentPageForm)

      skeleton.classList.add('hidden')
      for (const row of rows) {
        const [link] = row.getElementsByTagName('a')
        link.onclick = async (e) => {
          e.preventDefault()

          const parsedId = link.id.replace(/_/g, '$')
          pageForm.__EVENTTARGET.value = parsedId
          const body = new FormData(pageForm)
          body.append('ctl00$ScriptManager1', `ctl00$CPH1$ctl03|${parsedId}`)

          const response = await fetch('./Compras.aspx?qs=W1HXHGHtH10%3d', {
            method: 'post',
            body,
            headers: {
              'X-MicrosoftAjax': 'Delta=true',
            },
          })
          const text = await response.text()
          window.open(unescape(text.split('|')[7]), '_blank')
        }
        link.onauxclick = link.onclick
        rootForm.appendChild(row)
      }

      pageIndex++
    } catch (err) {
      console.error(err, pageIndex)
    }
    isFetching = false
    if(!stillVisible || pageIndex > pages) return
    await getPage(true)
  }


  const observer = new IntersectionObserver(async ([entry]) => {
    stillVisible = entry.isIntersecting
    if (!entry.isIntersecting || pageIndex > pages || isFetching) return
    await getPage()
  })
  observer.observe(lastElement)

}

function injectFilter() {
  if (document.getElementsByClassName('fab-button').length) return

  const VISIBLE_ICON = `<i class="fa fa-eye"></i>`
  const NOT_VISIBLE_ICON = `<i class="fa fa-eye-slash"></i>`

  const fabButton = document.createElement('button')
  document.body.appendChild(fabButton)

  const hideElements = hidden => {
    fabButton.innerHTML = hidden ? NOT_VISIBLE_ICON : VISIBLE_ICON

    Object.values(rowsByKey).forEach(row => {
      if (!row.isVisited()) return
      row.toggleVisibility(hidden)
    })
  }
  hideElements(isHidden)
  fabButton.classList.add('fab-button')

  fabButton.onclick = () => {
    const value = !localStorage.getParsedItem(HIDE_VISITED)
    localStorage.stringifyAndSetItem(HIDE_VISITED, value)
    hideElements(value)
  }
}

function injectScript(table) {
  injectFormat(table)
  injectInfinitScroll(table.lastChild)
  injectFilter()
}


new MutationObserver(() => {
  const table = document.querySelector(`#${TABLE_ID}:not(.injected)`)
  if (!table) return

  table.classList.add('injected')
  injectScript(table)
}).observe(document, { childList: true, subtree: true })

const icons = document.createElement('link')
icons.rel = 'stylesheet'
icons.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css'
document.head.appendChild(icons)

const styles = document.createElement('style')
document.head.appendChild(styles)
styles.innerHTML = `
  #ctl00_CPH1_btnDescargarReporteExcelAperturaProxima {
    margin-top: 24px;
  }
  .new-row {
    background-color: aquamarine;
    font-weight: bolder;
  }
  .new-row:hover {
    background-color: #d5fff1 !important;
  }
  tr:hover {
    background-color: #f0f9fe;
  }
  .nowrap {
    white-space: nowrap;
  }
  .hidden {
    display: none !important;
  }
  .fab-button {
    display: flex;
    width: 70px;
    height: 70px;
    background-color: #0072bc;
    border-radius: 50%;
    box-shadow: 0 6px 10px 0 #666;
    transition: all 0.1s ease-in-out;
    font-size: 42px;
    color: white;
    text-align: center;
    position: fixed;
    right: 50px;
    bottom: 50px;
    border: none;
    text-align: center;
    justify-content: center;
    align-items: center;
  }
  .injected {
    margin-bottom: 0;
  }
  .skeleton-container {
    display: flex;
    flex-direction: column;
    width: 100%;
  }
  .skeleton-item {
    width: 100%;
    height: 70px;
    background-image: linear-gradient(90deg, #F4F4F4 0px, rgba(229,229,229,0.8) 40px, #F4F4F4 80px);
    border-top: solid 1px #e5e5e5;
    animation: skeleton-animation 2s infinite ease-out;
    background-size: 1800px;
  }
  .skeleton-item.an-2 {
    animation: skeleton-animation-2 2.3s infinite ease-out !important;
  }
  .skeleton-item.an-3 {
    animation: skeleton-animation-3 2.8s infinite ease-out !important;
  }

  .fab-button:hover {
    box-shadow: 0 6px 14px 0 #666;
    transform: scale(1.05);
  }

  @media (min-width: 768px) {
    .container {
      width: auto;
    }
  }

  @media screen and (max-width: 817px) {
    .table-responsive {
      width: 100%;
      margin-bottom: 15px;
      overflow-y: hidden;
      -ms-overflow-style: -ms-autohiding-scrollbar;
      border: 1px solid #ddd;
    }
  }

  @media (min-width: 1200px) {
    .container {
      width: 1170px !important;
    }
  }

  @keyframes skeleton-animation {
    0% {
      background-position: -400px;
    }
    40% {
      background-position: 1100px;
    }
    100% {
      background-position: 1100px;
    }
  }
  @keyframes skeleton-animation-2 {
    0% {
      background-position: -300px;
    }
    40% {
      background-position: 1100px;
    }
    100% {
      background-position: 1100px;
    }
  }
  @keyframes skeleton-animation-3 {
    0% {
      background-position: -100px;
    }
    40% {
      background-position: 1100px;
    }
    100% {
      background-position: 1100px;
    }
  }
`
