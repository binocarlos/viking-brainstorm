function logger(st){
  st = st.replace(/^\[/, '[' + new Date().getTime() + ' - ')
  console.log(st)
}

function error(st){
  console.error(st)
}