import { getPackageNameFilter } from '../../src/packages'
  
describe('package name filter -- create filter', () => {

    const packageNameList = [
      'com.company.project.module1.package1',
      'com.company.project.module1.package2',
      'com.company.project.module2.package1',
      'com.company.project.module2.package2',
      'com.company.project.module3.package-name-lorem',
      'com.company.project.module3.package-name-ipsum',
      'com.company.project.module3.package-name-dolor',
    ]

    it('getPackageNameFilter -- wildcard end filter', done => {
      const filter = getPackageNameFilter('com.company.project.module1.*')
      
      const result = packageNameList.filter(filter.apply);

      expect(filter.subfilters[0].type).toBe('wildcard')
      expect(result).toEqual([
        'com.company.project.module1.package1',
        'com.company.project.module1.package2',
      ])
      done()
    })

    it('getPackageNameFilter -- wildcard start filter', done => {
      const filter = getPackageNameFilter('*.package1')
      
      const result = packageNameList.filter(filter.apply);

      expect(filter.subfilters[0].type).toBe('wildcard')
      expect(result).toEqual([
        'com.company.project.module1.package1',
        'com.company.project.module2.package1',
      ])
      done()
    })

    it('getPackageNameFilter -- wildcard both sides filter', done => {
      const filter = getPackageNameFilter('*.project.module3.*')
      
      const result = packageNameList.filter(filter.apply);

      expect(filter.subfilters[0].type).toBe('wildcard')
      expect(result).toEqual([
        'com.company.project.module3.package-name-lorem',
        'com.company.project.module3.package-name-ipsum',
        'com.company.project.module3.package-name-dolor'
        ])
      done()
    })


    it('getPackageNameFilter -- wildcard all filter', done => {
      const filter = getPackageNameFilter('*')
      
      const result = packageNameList.filter(filter.apply);

      expect(filter.subfilters[0].type).toBe('wildcard')
      expect(result).toEqual(packageNameList.slice())
      done()
    })

    it('getPackageNameFilter -- regex filter', done => {
      const filter = getPackageNameFilter('/com\\.company\\.project\\.module.*\\.package1/')
      const result = packageNameList.filter(filter.apply);

      expect(filter.subfilters[0].type).toBe('regex')
      expect(result).toEqual([
        'com.company.project.module1.package1',
        'com.company.project.module2.package1',
      ])
      done()
    })

    it('getPackageNameFilter -- exact match filter', done => {
      const filter = getPackageNameFilter('com.company.project.module1.package1')
      const result = packageNameList.filter(filter.apply);

      expect(filter.subfilters[0].type).toBe('string')
      expect(result).toEqual(['com.company.project.module1.package1'])
      done()
    })


    it('getPackageNameFilter -- multiple filters', done => {
      const filter = getPackageNameFilter('com.company.project.module1.package1, com.company.project.module2.*, /.*module3.*-ipsum/')
      const result = packageNameList.filter(filter.apply);

      expect(filter.subfilters.length).toBe(3)
      expect(filter.subfilters[0].type).toBe('string')
      expect(filter.subfilters[1].type).toBe('wildcard')
      expect(filter.subfilters[2].type).toBe('regex')
      expect(result).toEqual([
        'com.company.project.module1.package1',
        'com.company.project.module2.package1',
        'com.company.project.module2.package2',
        'com.company.project.module3.package-name-ipsum'
      ])
      done()
    })


    it('getPackageNameFilter -- memoization, same input shoud return same output', done => {
      const filterText = 'com.company.project.module1.package1, com.company.project.module2.*, /.*module3.*-dolor/, *.-lorem'
      const filter1 = getPackageNameFilter(filterText)
      const filter2 = getPackageNameFilter(filterText)
      expect(filter1).toBe(filter2)
      expect(filter1.subfilters.length).toBe(4)
      done()
    })
  })