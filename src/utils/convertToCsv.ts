/**
 * Converts the given JSON object array to a CSV string.
 * @param data - the array of JSON objects to convert.
 */
export const convertToCSV = (
  data: any,
  sasFormats?: { formats: { [key: string]: string } }
) => {
  let formats = sasFormats?.formats
  let headers: string[] = []
  let csvTest
  let invalidString = false
  const specialMissingValueRegExp = /^[a-z_]{1}$/i

  if (formats) {
    headers = Object.keys(formats).map((key) => `${key}:${formats![key]}`)
  }

  const headerFields = Object.keys(data[0])

  headerFields.forEach((field) => {
    if (!formats || !Object.keys(formats).includes(field)) {
      let hasNullOrNumber = false
      let hasSpecialMissingString = false

      data.forEach((row: { [key: string]: any }) => {
        if (row[field] === null || typeof row[field] === 'number') {
          hasNullOrNumber = true
        } else if (
          typeof row[field] === 'string' &&
          specialMissingValueRegExp.test(row[field])
        ) {
          hasSpecialMissingString = true
        }
      })

      if (hasNullOrNumber && hasSpecialMissingString) {
        headers.push(`${field}:best.`)

        if (!formats) formats = {}

        formats[field] = 'best.'
      } else {
        let firstFoundType: string | null = null
        let hasMixedTypes: boolean = false
        let rowNumError: number = -1

        const longestValueForField = data
          .map((row: any, index: number) => {
            if (row[field] || row[field] === '') {
              if (firstFoundType) {
                let currentFieldType =
                  row[field] === '' || typeof row[field] === 'string'
                    ? 'chars'
                    : 'number'

                if (!hasMixedTypes) {
                  hasMixedTypes = currentFieldType !== firstFoundType
                  rowNumError = hasMixedTypes ? index + 1 : -1
                }
              } else {
                if (row[field] === '') {
                  firstFoundType = 'chars'
                } else {
                  firstFoundType =
                    typeof row[field] === 'string' ? 'chars' : 'number'
                }
              }

              let byteSize

              if (typeof row[field] === 'string') {
                byteSize = getByteSize(row[field])
              }

              return byteSize
            }
          })
          .sort((a: number, b: number) => b - a)[0]

        if (longestValueForField && longestValueForField > 32765) {
          invalidString = true
        }

        if (hasMixedTypes) {
          console.error(
            `Row (${rowNumError}), Column (${field}) has mixed types: ERROR`
          )
        }

        headers.push(
          `${field}:${firstFoundType === 'chars' ? '$char' : ''}${
            longestValueForField
              ? longestValueForField
              : firstFoundType === 'chars'
              ? '1'
              : 'best'
          }.`
        )
      }
    }
  })

  if (sasFormats) {
    headers = headers.sort(
      (a, b) =>
        headerFields.indexOf(a.replace(/:.*/, '')) -
        headerFields.indexOf(b.replace(/:.*/, ''))
    )
  }

  if (invalidString) return 'ERROR: LARGE STRING LENGTH'

  csvTest = data.map((row: any) => {
    const fields = Object.keys(row).map((fieldName, index) => {
      let value
      const currentCell = row[fieldName]

      if (typeof currentCell === 'number') return currentCell

      // stringify with replacer converts null values to empty strings
      value = currentCell === null ? '' : currentCell

      if (formats && formats[fieldName] === 'best.') {
        if (value && !specialMissingValueRegExp.test(value)) {
          console.log(`🤖[value]🤖`, value)
          throw new Error(
            'Special missing value can only be a single character from A to Z or _'
          )
        }

        return `.${value.toLowerCase()}`
      }

      // if there any present, it should have preceding (") for escaping
      value = value.replace(/"/g, `""`)

      // also wraps the value in double quotes
      value = `"${value}"`

      if (
        value.substring(1, value.length - 1).search(/(\t|\n|\r|,|\'|\")/gm) < 0
      ) {
        // Remove wrapping quotes for values that don't contain special characters
        value = value.substring(1, value.length - 1)
      }

      value = value.replace(/\r\n/gm, '\n')

      if (value === '' && headers[index].includes('best')) {
        value = '.'
      }

      return value
    })
    return fields.join(',')
  })

  let finalCSV =
    headers.join(',').replace(/,/g, ' ') + '\r\n' + csvTest.join('\r\n')

  return finalCSV
}

const getByteSize = (str: string) => {
  let byteSize = str.length
  for (let i = str.length - 1; i >= 0; i--) {
    const code = str.charCodeAt(i)
    if (code > 0x7f && code <= 0x7ff) byteSize++
    else if (code > 0x7ff && code <= 0xffff) byteSize += 2
    if (code >= 0xdc00 && code <= 0xdfff) i-- //trail surrogate
  }
  return byteSize
}
